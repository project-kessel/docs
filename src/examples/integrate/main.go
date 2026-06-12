package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"
	"net"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/project-kessel/kessel-sdk-go/kessel/auth"
	kesselgrpc "github.com/project-kessel/kessel-sdk-go/kessel/grpc"
	"github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
)

// TaskService implements your application's gRPC service.
type TaskService struct {
	kessel     v1beta2.KesselInventoryServiceClient
	db         *DB
	instanceID string
	baseURL    string
}

func main() {
	// --- Create the Kessel client ---
	kesselClient, cleanup, err := newKesselClient()
	if err != nil {
		log.Fatalf("kessel client: %v", err)
	}
	defer cleanup()

	// --- Set up gRPC server with Kessel auth interceptor ---
	viewAuth := KesselAuthInterceptor(kesselClient, "task", "TASKMANAGER", "view")
	editAuth := KesselAuthInterceptor(kesselClient, "task", "TASKMANAGER", "edit")

	server := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			routeInterceptor(map[string]grpc.UnaryServerInterceptor{
				"/taskmanager.TaskService/GetTask":    viewAuth,
				"/taskmanager.TaskService/UpdateTask": editAuth,
			}),
		),
	)

	svc := &TaskService{
		kessel:     kesselClient,
		db:         &DB{},
		instanceID: envOrDefault("REPORTER_INSTANCE_ID", "taskmanager-1"),
		baseURL:    envOrDefault("BASE_URL", "http://localhost:8080"),
	}

	// Register your service with the gRPC server.
	// In a real project this would be the generated registration function:
	//   taskpb.RegisterTaskServiceServer(server, svc)
	_ = svc

	lis, err := net.Listen("tcp", ":8080")
	if err != nil {
		log.Fatalf("listen: %v", err)
	}
	log.Println("serving on :8080")
	if err := server.Serve(lis); err != nil {
		log.Fatalf("serve: %v", err)
	}
}

// newKesselClient creates an authenticated Kessel Inventory client
// using OAuth2 credentials and TLS.
func newKesselClient() (v1beta2.KesselInventoryServiceClient, func(), error) {
	oauthCreds := auth.NewOAuth2ClientCredentials(
		os.Getenv("KESSEL_CLIENT_ID"),
		os.Getenv("KESSEL_CLIENT_SECRET"),
		os.Getenv("KESSEL_TOKEN_ENDPOINT"),
	)

	caCert, err := os.ReadFile(os.Getenv("KESSEL_CA_CERT_PATH"))
	if err != nil {
		return nil, nil, fmt.Errorf("read CA cert: %w", err)
	}
	certPool := x509.NewCertPool()
	certPool.AppendCertsFromPEM(caCert)
	tlsCreds := credentials.NewTLS(&tls.Config{RootCAs: certPool})

	client, conn, err := v1beta2.NewClientBuilder(os.Getenv("KESSEL_ENDPOINT")).
		Authenticated(kesselgrpc.OAuth2CallCredentials(&oauthCreds), tlsCreds).
		Build()
	if err != nil {
		return nil, nil, fmt.Errorf("build client: %w", err)
	}
	return client, func() { conn.Close() }, nil
}

// CreateTask handles task creation. After writing to the database,
// it reports the new resource to Kessel.
func (s *TaskService) CreateTask(ctx context.Context, req *CreateTaskRequest) (*CreateTaskResponse, error) {
	task, err := s.db.InsertTask(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "insert task: %v", err)
	}

	_, err = s.kessel.ReportResource(ctx, &v1beta2.ReportResourceRequest{
		Type:               "task",
		ReporterType:       "TASKMANAGER",
		ReporterInstanceId: s.instanceID,
		Representations: &v1beta2.ResourceRepresentations{
			Metadata: &v1beta2.RepresentationMetadata{
				LocalResourceId: task.ID,
				ApiHref:         fmt.Sprintf("%s/api/tasks/%s", s.baseURL, task.ID),
			},
			Common: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"workspace_id": structpb.NewStringValue(task.WorkspaceID),
				},
			},
			Reporter: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"title":  structpb.NewStringValue(task.Title),
					"status": structpb.NewStringValue(task.Status),
				},
			},
		},
	})
	if err != nil {
		log.Printf("kessel: failed to report task %s: %v", task.ID, err)
	}

	return &CreateTaskResponse{Task: task}, nil
}

// DeleteTask handles task deletion. After removing the resource from the
// database, it reports the deletion to Kessel.
func (s *TaskService) DeleteTask(ctx context.Context, req *DeleteTaskRequest) (*DeleteTaskResponse, error) {
	if err := s.db.DeleteTask(ctx, req.ID); err != nil {
		return nil, status.Errorf(codes.Internal, "delete task: %v", err)
	}

	_, err := s.kessel.ReportResource(ctx, &v1beta2.ReportResourceRequest{
		Type:               "task",
		ReporterType:       "TASKMANAGER",
		ReporterInstanceId: s.instanceID,
		Representations: &v1beta2.ResourceRepresentations{
			Metadata: &v1beta2.RepresentationMetadata{
				LocalResourceId: req.ID,
				ResourceDeleted: true,
			},
		},
	})
	if err != nil {
		log.Printf("kessel: failed to report task deletion %s: %v", req.ID, err)
	}

	return &DeleteTaskResponse{}, nil
}

// KesselAuthInterceptor returns a gRPC server interceptor that checks
// Kessel permissions before forwarding the call to the handler.
func KesselAuthInterceptor(client v1beta2.KesselInventoryServiceClient, resourceType, reporterType, relation string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.PermissionDenied, "missing metadata")
		}

		userIDs := md.Get("x-user-id")
		if len(userIDs) == 0 {
			return nil, status.Error(codes.PermissionDenied, "missing user identity")
		}

		resourceID := extractResourceID(req)

		resp, err := client.Check(ctx, &v1beta2.CheckRequest{
			Object: &v1beta2.ResourceReference{
				ResourceType: resourceType,
				ResourceId:   resourceID,
				Reporter:     &v1beta2.ReporterReference{Type: reporterType},
			},
			Relation: relation,
			Subject: &v1beta2.SubjectReference{
				Resource: &v1beta2.ResourceReference{
					ResourceType: "principal",
					ResourceId:   userIDs[0],
					Reporter:     &v1beta2.ReporterReference{Type: "rbac"},
				},
			},
		})
		if err != nil {
			if st, ok := status.FromError(err); ok && st.Code() == codes.Unavailable {
				return nil, status.Error(codes.Unavailable, "authorization service unavailable")
			}
			return nil, status.Error(codes.PermissionDenied, "forbidden")
		}

		if resp.Allowed != v1beta2.Allowed_ALLOWED_TRUE {
			return nil, status.Error(codes.PermissionDenied, "forbidden")
		}

		return handler(ctx, req)
	}
}

// routeInterceptor dispatches to per-method interceptors based on the
// full gRPC method name. Methods without a mapping pass through directly.
func routeInterceptor(routes map[string]grpc.UnaryServerInterceptor) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		if interceptor, ok := routes[info.FullMethod]; ok {
			return interceptor(ctx, req, info, handler)
		}
		return handler(ctx, req)
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// Stubs below stand in for your protobuf-generated types and database layer.
type CreateTaskRequest struct {
	Title       string
	WorkspaceID string
}
type CreateTaskResponse struct{ Task Task }
type DeleteTaskRequest struct{ ID string }
type DeleteTaskResponse struct{}
type Task struct {
	ID          string
	WorkspaceID string
	Title       string
	Status      string
}
type DB struct{}

func (db *DB) InsertTask(ctx context.Context, req *CreateTaskRequest) (Task, error) {
	return Task{}, nil
}
func (db *DB) DeleteTask(ctx context.Context, id string) error { return nil }
func extractResourceID(req interface{}) string                 { return "" }
