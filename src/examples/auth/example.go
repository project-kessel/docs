package main

import (
	"context"
	"log"
	"os"

	"github.com/project-kessel/kessel-sdk-go/kessel/auth"
	"github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
	v2 "github.com/project-kessel/kessel-sdk-go/kessel/rbac/v2"
)

func main() {
	ctx := context.Background()

	//#region discover
	// Option 1: Use OIDC discovery to find the token endpoint automatically
	discovered, err := auth.FetchOIDCDiscovery(ctx, os.Getenv("ISSUER_URL"), auth.FetchOIDCDiscoveryOptions{})
	if err != nil {
		log.Fatal("OIDC discovery failed:", err)
	}
	credentials := auth.NewOAuth2ClientCredentials(
		os.Getenv("CLIENT_ID"),
		os.Getenv("CLIENT_SECRET"),
		discovered.TokenEndpoint,
	)
	//#endregion

	//#region direct-token
	// Option 2: Provide the token endpoint URL directly
	credentials = auth.NewOAuth2ClientCredentials(
		os.Getenv("CLIENT_ID"),
		os.Getenv("CLIENT_SECRET"),
		os.Getenv("TOKEN_ENDPOINT"),
	)
	//#endregion

	//#region build-client
	client, conn, err := v1beta2.NewClientBuilder(os.Getenv("KESSEL_ENDPOINT")).
		OAuth2ClientAuthenticated(&credentials, nil).
		Build()
	if err != nil {
		log.Fatal("Failed to create client:", err)
	}
	defer conn.Close()
	//#endregion

	_ = client

	//#region rbac-auth
	// Wrap credentials as an HTTP auth adapter for RBAC REST calls
	authRequest := auth.OAuth2AuthRequest(&credentials, auth.OAuth2AuthRequestOptions{})

	rootWorkspace, err := v2.FetchRootWorkspace(ctx, os.Getenv("RBAC_ENDPOINT"), os.Getenv("ORG_ID"), v2.FetchWorkspaceOptions{
		Auth: authRequest,
	})
	if err != nil {
		log.Fatal("Failed to fetch workspace:", err)
	}
	log.Printf("Root workspace: %s (ID: %s)", rootWorkspace.Name, rootWorkspace.Id)
	//#endregion
}
