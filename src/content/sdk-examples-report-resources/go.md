---
language: "Go"
order: 30
---

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"google.golang.org/protobuf/types/known/structpb"

	_ "github.com/joho/godotenv/autoload"

	"github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func reportResource() {
	ctx := context.Background()

	// For authenticated environments, uncomment and configure the following:
	// auth, err := oauth2.NewClientCredentials(oauth2.ClientCredentialsConfig{
	//     ClientID:     clientID,
	//     ClientSecret: clientSecret,
	//     TokenURL:     issuerURL + "/token",
	// })
	// if err != nil {
	//     log.Fatal("Failed to create OAuth2 credentials:", err)
	// }
	// inventoryClient, conn, err := v1beta2.NewClientBuilder(kesselEndpoint).
	//     OAuth2ClientAuthenticated(auth).
	//     Build()

	// For insecure local development:
	inventoryClient, conn, err := v1beta2.NewClientBuilder(kesselEndpoint).
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

	reportResourceRequest := &v1beta2.ReportResourceRequest{
		Type:               "host",
		ReporterType:       "hbi",
		ReporterInstanceId: "3088be62-1c60-4884-b133-9200542d0b3f",
		Representations: &v1beta2.ResourceRepresentations{
			Metadata: &v1beta2.RepresentationMetadata{
				LocalResourceId: "dd1b73b9-3e33-4264-968c-e3ce55b9afec",
				ApiHref:         "https://apiHref.com/",
				ConsoleHref:     addr("https://www.console.com/"),
				ReporterVersion: addr("2.7.16"),
			},
			Common: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"workspace_id": structpb.NewStringValue("a64d17d0-aec3-410a-acd0-e0b85b22c076"),
				},
			},
			Reporter: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"satellite_id":          structpb.NewStringValue("ca234d8f-9861-4659-a033-e80460b2801c"),
					"sub_manager_id":        structpb.NewStringValue("e9b7d65f-3f81-4c26-b86c-2db663376eed"),
					"insights_inventory_id": structpb.NewStringValue("05707922-7b0a-4fe6-982d-6adbc7695b8f"),
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

func addr[T any](t T) *T { return &t }

func main() { reportResource() }
```
