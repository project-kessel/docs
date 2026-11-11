package main

import (
	"context"
	"fmt"
	"log"

	_ "github.com/joho/godotenv/autoload"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
)

const KESSEL_ENDPOINT = "localhost:9081"

func main() {
	ctx := context.Background()

	//#region setup
	inventoryClient, conn, err := v1beta2.NewClientBuilder(KESSEL_ENDPOINT).
		Insecure().
		Build()
	if err != nil {
		log.Fatal("Failed to create gRPC client:", err)
	}
	defer func() {
		if closeErr := conn.Close(); closeErr != nil {
			log.Printf("Failed to close gRPC client: %v", closeErr)
		}
	}()
	//#endregion

	//#region add
	// Add the workspace relationship without re-reporting the document's
	// full representation. Only the named relationship values change.
	addRequest := &v1beta2.AddResourceRelationshipsRequest{
		Type:               "document",
		ReporterType:       "drive",
		ReporterInstanceId: "drive-1",
		LocalResourceId:    "doc-123",
		Common: &structpb.Struct{
			Fields: map[string]*structpb.Value{
				"workspace_id": structpb.NewStringValue("workspace-2"),
			},
		},
	}

	_, err = inventoryClient.AddResourceRelationships(ctx, addRequest)
	if err != nil {
		log.Fatalf("AddResourceRelationships failed: %v", err)
	}
	//#endregion

	//#region remove
	// Remove the previous workspace relationship. Removing a value that is
	// not present is an idempotent no-op.
	removeRequest := &v1beta2.RemoveResourceRelationshipsRequest{
		Type:               "document",
		ReporterType:       "drive",
		ReporterInstanceId: "drive-1",
		LocalResourceId:    "doc-123",
		Common: &structpb.Struct{
			Fields: map[string]*structpb.Value{
				"workspace_id": structpb.NewStringValue("workspace-1"),
			},
		},
	}

	_, err = inventoryClient.RemoveResourceRelationships(ctx, removeRequest)
	if err != nil {
		log.Fatalf("RemoveResourceRelationships failed: %v", err)
	}
	//#endregion

	//#region check
	// NOTE: You may need to wait for replication and caches to update.
	checkRequest := &v1beta2.CheckRequest{
		Object: &v1beta2.ResourceReference{
			ResourceType: "document",
			ResourceId:   "doc-123",
			Reporter:     &v1beta2.ReporterReference{Type: "drive"},
		},
		Relation: "view",
		Subject: &v1beta2.SubjectReference{
			Resource: &v1beta2.ResourceReference{
				ResourceType: "principal",
				ResourceId:   "sarah",
				Reporter:     &v1beta2.ReporterReference{Type: "rbac"},
			},
		},
	}

	fmt.Println("Making check request:")
	response, err := inventoryClient.Check(ctx, checkRequest)
	if err != nil {
		if st, ok := status.FromError(err); ok {
			switch st.Code() {
			case codes.Unavailable:
				log.Fatalf("Service unavailable: %v", st.Message())
			case codes.DeadlineExceeded:
				log.Fatalf("Request timed out: %v", st.Message())
			default:
				log.Fatalf("Check failed: %v", st.Message())
			}
		}
		log.Fatalf("Check failed: %v", err)
	}
	fmt.Println(response)
	//#endregion
}
