---
language: "Go"
order: 30
---

### Configure TLS Transport Credentials

```go
import (
    "crypto/tls"
    "crypto/x509"
    "fmt"
    "os"
    
    "google.golang.org/grpc/credentials"
)

func configureTLS(caPath string) (credentials.TransportCredentials, error) {
    caCert, err := os.ReadFile(caPath)
    if err != nil {
        return nil, fmt.Errorf("failed to read the ca cert file at provided path %s: %w", caPath, err)
    }
    return configureTLSFromData(caCert)
}

func configureTLSFromData(caCert []byte) (credentials.TransportCredentials, error) {
    certPool := x509.NewCertPool()
    if !certPool.AppendCertsFromPEM(caCert) {
        return nil, fmt.Errorf("failed to add the server CA's certificate to new cert pool")
    }
    config := &tls.Config{
        RootCAs: certPool,
    }
    return credentials.NewTLS(config), nil
}
```

### Combine TLS with OAuth2

```go
import (
    "github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
    "github.com/project-kessel/kessel-sdk-go/kessel/auth"
    kesselgrpc "github.com/project-kessel/kessel-sdk-go/kessel/grpc"
)

// Configure OAuth 2.0 credentials
oauthCredentials := auth.NewOAuth2ClientCredentials(
    clientId,
    clientSecret,
    tokenEndpoint,
)

// Configure TLS credentials
channelCreds, err := configureTLS(caCertFile)
if err != nil {
    return fmt.Errorf("failed to setup transport credentials for TLS: %w", err)
}

// Build client with both authentication and TLS
client, conn, err := v1beta2.NewClientBuilder(inventoryURL).
    Authenticated(kesselgrpc.OAuth2CallCredentials(&oauthCredentials), channelCreds).
    Build()

if err != nil {
    return fmt.Errorf("failed to create gRPC client: %w", err)
}
defer conn.Close()
```

### Complete Example

```go
package main

import (
    "context"
    "crypto/tls"
    "crypto/x509"
    "fmt"
    "log"
    "os"

    "google.golang.org/grpc/credentials"
    "google.golang.org/protobuf/types/known/structpb"

    "github.com/project-kessel/kessel-sdk-go/kessel/auth"
    kesselgrpc "github.com/project-kessel/kessel-sdk-go/kessel/grpc"
    "github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
)

func configureTLS(caPath string) (credentials.TransportCredentials, error) {
    caCert, err := os.ReadFile(caPath)
    if err != nil {
        return nil, fmt.Errorf("failed to read the ca cert file: %w", err)
    }
    
    certPool := x509.NewCertPool()
    if !certPool.AppendCertsFromPEM(caCert) {
        return nil, fmt.Errorf("failed to add server CA certificate")
    }
    
    config := &tls.Config{
        RootCAs: certPool,
    }
    return credentials.NewTLS(config), nil
}

func main() {
    // Configure OAuth 2.0 credentials
    oauthCredentials := auth.NewOAuth2ClientCredentials(
        os.Getenv("CLIENT_ID"),
        os.Getenv("CLIENT_SECRET"),
        os.Getenv("TOKEN_ENDPOINT"),
    )

    // Configure TLS transport credentials
    channelCreds, err := configureTLS("/ca-certs/service-ca.crt")
    if err != nil {
        log.Fatalf("Failed to setup TLS: %v", err)
    }

    // Build authenticated client with TLS
    client, conn, err := v1beta2.NewClientBuilder(os.Getenv("KESSEL_ENDPOINT")).
        Authenticated(kesselgrpc.OAuth2CallCredentials(&oauthCredentials), channelCreds).
        Build()
    if err != nil {
        log.Fatalf("Failed to create client: %v", err)
    }
    defer conn.Close()

    ctx := context.Background()

    // Example: Report a resource
    reportRequest := &v1beta2.ReportResourceRequest{
        Type:               "document",
        ReporterType:       "drive",
        ReporterInstanceId: "drive-1",
        Representations: &v1beta2.ResourceRepresentations{
            Metadata: &v1beta2.RepresentationMetadata{
                LocalResourceId: "doc-123",
                ApiHref:         "https://drive.example.com/document/123",
            },
            Common: &structpb.Struct{
                Fields: map[string]*structpb.Value{
                    "workspace_id": structpb.NewStringValue("workspace-1"),
                },
            },
        },
    }

    response, err := client.ReportResource(ctx, reportRequest)
    if err != nil {
        log.Fatalf("Failed to report resource: %v", err)
    }

    fmt.Printf("Successfully reported resource: %+v\n", response)
}
```

