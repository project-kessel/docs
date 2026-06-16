package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
)

//#region client-setup
func newKesselClient() (v1beta2.KesselInventoryServiceClient, func(), error) {
	client, conn, err := v1beta2.NewClientBuilder(os.Getenv("KESSEL_ENDPOINT")).
		Insecure().
		Build()
	if err != nil {
		return nil, nil, fmt.Errorf("build client: %w", err)
	}
	return client, func() { conn.Close() }, nil
}

//#endregion

//#region report-on-create
func (s *TaskService) CreateTask(ctx context.Context, req *CreateTaskRequest) (*CreateTaskResponse, error) {
	// --- Your existing service logic ---
	task, err := s.db.InsertTask(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "insert task: %v", err)
	}

	// --- Report to Kessel ---
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
		// Log the error but don't fail the request.
		// The resource exists in your database; Kessel will catch up
		// on the next report or through a reconciliation process.
		log.Printf("kessel: failed to report task %s: %v", task.ID, err)
	}

	return &CreateTaskResponse{Task: task}, nil
}

//#endregion

//#region check-middleware
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
		userID := userIDs[0]

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
					ResourceId:   userID,
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

// Wire it up when creating the gRPC server:
//
//   viewAuth := KesselAuthInterceptor(kesselClient, "task", "TASKMANAGER", "view")
//   editAuth := KesselAuthInterceptor(kesselClient, "task", "TASKMANAGER", "edit")
//
//   server := grpc.NewServer(
//       grpc.ChainUnaryInterceptor(viewAuth),
//   )
//#endregion

// Type stubs for compilation context.
type TaskService struct {
	db         interface{ InsertTask(context.Context, *CreateTaskRequest) (Task, error) }
	kessel     v1beta2.KesselInventoryServiceClient
	instanceID string
	baseURL    string
}
type CreateTaskRequest struct{}
type CreateTaskResponse struct{ Task Task }
type Task struct {
	ID          string
	WorkspaceID string
	Title       string
	Status      string
}

func extractResourceID(req interface{}) string { return "" }
func main()                                    {}
