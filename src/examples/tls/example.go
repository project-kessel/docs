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

// #region configure-tls
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

//#endregion

func main() {
	//#region configure-oauth
	// Configure OAuth 2.0 credentials
	oauthCredentials := auth.NewOAuth2ClientCredentials(
		os.Getenv("CLIENT_ID"),
		os.Getenv("CLIENT_SECRET"),
		os.Getenv("TOKEN_ENDPOINT"),
	)
	//#endregion

	//#region combine-both
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
	//#endregion

	ctx := context.Background()

	//#region usage
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
	//#endregion
}
