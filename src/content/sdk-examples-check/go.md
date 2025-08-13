---
language: "Go"
order: 30
---

```go
package main

import (
	"context"
	"fmt"
	"google.golang.org/protobuf/types/known/structpb"
	"log"
	"os"

	_ "github.com/joho/godotenv/autoload"

	v1beta2 "github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

func addr[T any](t T) *T { return &t }

func main() {
	ctx := context.Background()

	var dialOpts []grpc.DialOption
	dialOpts = append(dialOpts, grpc.WithTransportCredentials(insecure.NewCredentials()))

	conn, err := grpc.NewClient(os.Getenv("KESSEL_ENDPOINT"), dialOpts...)
	if err != nil {
		log.Fatal("Failed to create gRPC client:", err)
	}
	defer func() {
		if closeErr := conn.Close(); closeErr != nil {
			log.Printf("Failed to close gRPC client: %v", closeErr)
		}
	}()

	inventoryClient := v1beta2.NewKesselInventoryServiceClient(conn)

	reportResourceRequest := &v1beta2.ReportResourceRequest{
		Type:               "host",
		ReporterType:       "hbi",
		ReporterInstanceId: "0a2a430e-1ad9-4304-8e75-cc6fd3b5441a",
		Representations: &v1beta2.ResourceRepresentations{
			Metadata: &v1beta2.RepresentationMetadata{
				LocalResourceId: "854589f0-3be7-4cad-8bcd-45e18f33cb81",
				ApiHref:         "https://apiHref.com/",
				ConsoleHref:     addr("https://www.consoleHref.com/"),
				ReporterVersion: addr("0.2.11"),
			},
			Common: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"workspace_id": structpb.NewStringValue("6eb10953-4ec9-4feb-838f-ba43a60880bf"),
				},
			},
			Reporter: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"satellite_id":          structpb.NewStringValue("ca234d8f-9861-4659-a033-e80460b2801c"),
					"sub_manager_id":        structpb.NewStringValue("e9b7d65f-3f81-4c26-b86c-2db663376eed"),
					"insights_inventory_id": structpb.NewStringValue("c4b9b5e7-a82a-467a-b382-024a2f18c129"),
					"ansible_host":          structpb.NewStringValue("host-1"),
				},
			},
		},
	}

	fmt.Println("Making report resource request:")

	response, err := inventoryClient.ReportResource(ctx, reportResourceRequest)
	if err != nil {
		if st, ok := status.FromError(err); ok {
			switch st.Code() {
			case codes.Unavailable:
				log.Fatal("Service unavailable: ", err)
			case codes.PermissionDenied:
				log.Fatal("Permission denied: ", err)
			default:
				log.Fatal("gRPC connection error: ", err)
			}
		} else {
			log.Fatal("Unknown error: ", err)
		}
	}
	fmt.Printf("Report resource response: %+v\n", response)
}

```
