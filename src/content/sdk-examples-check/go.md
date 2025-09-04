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

## Creating Check Requests

Build a permission check request:

```go
checkRequest := &v1beta2.CheckRequest{
    Object: &v1beta2.ResourceReference{
        ResourceType: "document",
        ResourceId:   "doc-123",
        Reporter: &v1beta2.ReporterReference{
            Type: "drive",
        },
    },
    Relation: "view",
    Subject: &v1beta2.SubjectReference{
        Resource: &v1beta2.ResourceReference{
            ResourceType: "principal",
            ResourceId:   "sarah",
            Reporter: &v1beta2.ReporterReference{
                Type: "rbac",
            },
        },
    },
}
```

## Sending Check Requests

Execute the check request and handle the response:

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

fmt.Println("Making check request:")
response, err := inventoryClient.Check(ctx, checkRequest)
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
fmt.Printf("Check response: %+v\n", response)
```

## Complete Example

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	_ "github.com/joho/godotenv/autoload"

	"github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"github.com/project-kessel/kessel-sdk-go/kessel/auth"
)

func checkResource() {
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

	checkRequest := &v1beta2.CheckRequest{
		Object: &v1beta2.ResourceReference{
			ResourceType: "document",
			ResourceId:   "doc-123",
			Reporter: &v1beta2.ReporterReference{
				Type: "drive",
			},
		},
		Relation: "view",
		Subject: &v1beta2.SubjectReference{
			Resource: &v1beta2.ResourceReference{
				ResourceType: "principal",
				ResourceId:   "sarah",
				Reporter: &v1beta2.ReporterReference{
					Type: "rbac",
				},
			},
		},
	}

	fmt.Println("Making check request:")
	response, err := inventoryClient.Check(ctx, checkRequest)
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
	fmt.Printf("Check response: %+v\n", response)
}

func main() { checkResource() }
```
