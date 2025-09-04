---
language: "Go"
order: 30
---

## Basic Client Setup

Create a basic Kessel client for local development:

```go
import "github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"

// For insecure local development:
inventoryClient, conn, err := v1beta2.NewClientBuilder(kesselEndpoint).
    Insecure().
    Build()
if err != nil {
    log.Fatal("Failed to create gRPC client:", err)
}
defer conn.Close()
```

## Auth Client Setup

Set up an authenticated client for production environments:

```go
import (
    "github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
    "github.com/project-kessel/kessel-sdk-go/kessel/auth"
)

// Fetch OIDC discovery information
discovered, err := auth.FetchOIDCDiscovery(ctx, os.Getenv("AUTH_DISCOVERY_ISSUER_URL"), auth.FetchOIDCDiscoveryOptions{
    HttpClient: nil, // Optionally specify an http client - defaults to http.DefaultClient
})
if err != nil {
    panic(err)
}

// Create OAuth2 credentials
oauthCredentials := auth.NewOAuth2ClientCredentials(
    os.Getenv("AUTH_CLIENT_ID"), 
    os.Getenv("AUTH_CLIENT_SECRET"), 
    discovered.TokenEndpoint,
)

// Build authenticated client
inventoryClient, conn, err := v1beta2.NewClientBuilder(os.Getenv("KESSEL_ENDPOINT")).
    OAuth2ClientAuthenticated(&oauthCredentials, nil).
    Build()
```

## Creating Report Resource Requests

Build a ReportResource Request:

```go
import "google.golang.org/protobuf/types/known/structpb"

reportResourceRequest := &v1beta2.ReportResourceRequest{
    Type:               "document",
    ReporterType:       "drive",
    ReporterInstanceId: "drive-1",
    Representations: &v1beta2.ResourceRepresentations{
        Metadata: &v1beta2.RepresentationMetadata{
            LocalResourceId: "doc-123",
            ApiHref:         "https://drive.example.com/document/123",
            ConsoleHref:     addr("https://www.console.com/drive/documents"),
            ReporterVersion: addr("2.7.16"),
        },
        Common: &structpb.Struct{
            Fields: map[string]*structpb.Value{
                "workspace_id": structpb.NewStringValue("workspace-1"),
            },
        },
        Reporter: &structpb.Struct{
            Fields: map[string]*structpb.Value{
                "document_id":    structpb.NewStringValue("doc-123"),
                "document_name":  structpb.NewStringValue("My Important Document"),
                "document_type":  structpb.NewStringValue("document"),
                "created_at":     structpb.NewStringValue("2025-08-31T10:30:00Z"),
                "file_size":      structpb.NewNumberValue(2048576),
                "owner_id":       structpb.NewStringValue("user-1"),
            },
        },
    },
}

func addr[T any](t T) *T { return &t }
```

## Sending Report Resource Requests

Execute the report resource request and handle the response:

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

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
```

## Complete Example

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
	"github.com/project-kessel/kessel-sdk-go/kessel/auth"
)

func reportResource() {
	ctx := context.Background()


	// For authenticated environments, uncomment and configure the following:
	// discovered, err := auth.FetchOIDCDiscovery(ctx, os.Getenv("AUTH_DISCOVERY_ISSUER_URL"), auth.FetchOIDCDiscoveryOptions{
	// 	HttpClient: nil, // Optionally specify an http client - defaults to http.DefaultClient
	// })

	// if err != nil {
	// 	panic(err)
	// }

	// oauthCredentials := auth.NewOAuth2ClientCredentials(os.Getenv("AUTH_CLIENT_ID"), os.Getenv("AUTH_CLIENT_SECRET"), discovered.TokenEndpoint)
	// inventoryClient, conn, err := v1beta2.NewClientBuilder(os.Getenv("KESSEL_ENDPOINT")).
	// 	OAuth2ClientAuthenticated(&oauthCredentials, nil).
	// 	Build()

	// For insecure local development:
	inventoryClient, conn, err := v1beta2.NewClientBuilder(os.Getenv("KESSEL_ENDPOINT")).
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
		Type:               "document",
		ReporterType:       "drive",
		ReporterInstanceId: "drive-1",
		Representations: &v1beta2.ResourceRepresentations{
			Metadata: &v1beta2.RepresentationMetadata{
				LocalResourceId: "doc-123",
				ApiHref:         "https://drive.example.com/document/123",
				ConsoleHref:     addr("https://www.console.com/drive/documents"),
				ReporterVersion: addr("2.7.16"),
			},
			Common: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"workspace_id": structpb.NewStringValue("workspace-1"),
				},
			},
			Reporter: &structpb.Struct{
				Fields: map[string]*structpb.Value{
					"document_id":    structpb.NewStringValue("doc-123"),
					"document_name":  structpb.NewStringValue("My Important Document"),
					"document_type":  structpb.NewStringValue("document"),
					"created_at":     structpb.NewStringValue("2025-08-31T10:30:00Z"),
					"file_size":      structpb.NewNumberValue(2048576),
					"owner_id":       structpb.NewStringValue("user-1"),
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
