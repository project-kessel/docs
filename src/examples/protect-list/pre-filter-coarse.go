package main

import (
	"context"
	"fmt"

	v1beta2 "github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
	v2 "github.com/project-kessel/kessel-sdk-go/kessel/rbac/v2"
)

//#region setup
// Initialize Kessel client (see "Protect an endpoint" guide for full setup)
func setupClient() (v1beta2.KesselInventoryServiceClient, error) {
	inventoryClient, conn, err := v1beta2.NewClientBuilder("localhost:9000").
		Insecure().
		Build()
	if err != nil {
		return nil, fmt.Errorf("failed to create client: %w", err)
	}
	defer conn.Close()
	return inventoryClient, nil
}
//#endregion

//#region get-workspaces
// getAccessibleWorkspaces returns all workspaces the user can access with the given permission.
//
// This uses the ListWorkspaces helper from kessel.rbac.v2 which
// handles StreamedListObjects pagination automatically.
func getAccessibleWorkspaces(ctx context.Context, client v1beta2.KesselInventoryServiceClient, userID, permission string) ([]string, error) {
	subject := v2.PrincipalSubject(userID, "redhat")

	var workspaceIDs []string
	for response, err := range v2.ListWorkspaces(ctx, client, subject, permission, "") {
		if err != nil {
			return nil, fmt.Errorf("failed to list workspaces: %w", err)
		}
		workspaceIDs = append(workspaceIDs, response.Object.ResourceId)
	}

	return workspaceIDs, nil
}
//#endregion

//#region filter-query
// Integration represents an integration in your database
type Integration struct {
	ID          string
	Name        string
	WorkspaceID string
}

// Database is a placeholder for your database interface
type Database interface {
	Query(query string, args ...interface{}) ([]*Integration, error)
}

// listIntegrations returns integrations the user can access.
//
// Pre-filtering: Get allowed workspaces first, then query only those.
func listIntegrations(ctx context.Context, client v1beta2.KesselInventoryServiceClient, db Database, userID string) ([]*Integration, error) {
	// Step 1: Get workspaces the user can access
	allowedWorkspaces, err := getAccessibleWorkspaces(ctx, client, userID, "myservice_integration_view")
	if err != nil {
		return nil, err
	}

	if len(allowedWorkspaces) == 0 {
		return []*Integration{}, nil
	}

	// Step 2: Query database with workspace filter
	query := "SELECT id, name, workspace_id FROM integrations WHERE workspace_id = ANY($1)"
	integrations, err := db.Query(query, allowedWorkspaces)
	if err != nil {
		return nil, fmt.Errorf("failed to query integrations: %w", err)
	}

	return integrations, nil
}
//#endregion
