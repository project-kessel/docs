---
language: "Go"
order: 30
---
### Import client
```bash
go get github.com/project-kessel/kessel-sdk-go
```

#### Basic Client Setup

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

#### Auth Client Setup

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


