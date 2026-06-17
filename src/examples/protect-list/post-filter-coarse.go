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
	inventoryClient, _, err := v1beta2.NewClientBuilder("localhost:9000").
		Insecure().
		Build()
	if err != nil {
		return nil, fmt.Errorf("failed to create client: %w", err)
	}
	return inventoryClient, nil
}

//#endregion

//#region filter-by-workspace
// Integration represents an integration in your database
type Integration struct {
	ID          string
	Name        string
	WorkspaceID string
}

// filterByWorkspacePermission filters integrations by checking workspace permissions.
//
// Post-filtering (coarse): Check workspace-level permissions for unique workspaces.
func filterByWorkspacePermission(
	ctx context.Context,
	client v1beta2.KesselInventoryServiceClient,
	integrations []*Integration,
	userID string,
	permission string,
) ([]*Integration, error) {
	// Step 1: Get unique workspace IDs
	workspaceSet := make(map[string]bool)
	for _, integration := range integrations {
		workspaceSet[integration.WorkspaceID] = true
	}
	var workspaceIDs []string
	for wsID := range workspaceSet {
		workspaceIDs = append(workspaceIDs, wsID)
	}

	// Step 2: Check workspace permissions with CheckBulk
	var items []*v1beta2.CheckBulkRequestItem
	for _, wsID := range workspaceIDs {
		item := &v1beta2.CheckBulkRequestItem{
			Object:   v2.WorkspaceResource(wsID),
			Relation: permission,
			Subject:  v2.PrincipalSubject(userID, "redhat"),
		}
		items = append(items, item)
	}

	request := &v1beta2.CheckBulkRequest{Items: items}
	response, err := client.CheckBulk(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to check bulk: %w", err)
	}

	// Step 3: Build set of allowed workspaces
	allowedWorkspaces := make(map[string]bool)
	for index, pair := range response.Pairs {
		if pair.Item != nil && pair.Item.Allowed == v1beta2.Allowed_ALLOWED_TRUE {
			allowedWorkspaces[workspaceIDs[index]] = true
		}
	}

	// Step 4: Filter resources by allowed workspaces
	var accessibleIntegrations []*Integration
	for _, integration := range integrations {
		if allowedWorkspaces[integration.WorkspaceID] {
			accessibleIntegrations = append(accessibleIntegrations, integration)
		}
	}

	return accessibleIntegrations, nil
}

//#endregion

//#region full-example
// Database is a placeholder for your database interface
type Database interface {
	Query(query string) ([]*Integration, error)
}

// listIntegrations returns integrations the user can access.
//
// Post-filtering (coarse): Query all integrations, then check workspace permissions.
func listIntegrations(ctx context.Context, client v1beta2.KesselInventoryServiceClient, db Database, userID string) ([]*Integration, error) {
	// Step 1: Query database
	allIntegrations, err := db.Query("SELECT * FROM integrations WHERE status = 'active'")
	if err != nil {
		return nil, fmt.Errorf("failed to query integrations: %w", err)
	}

	// Step 2: Filter by workspace permission
	accessible, err := filterByWorkspacePermission(
		ctx,
		client,
		allIntegrations,
		userID,
		"myservice_integration_view",
	)
	if err != nil {
		return nil, err
	}

	return accessible, nil
}

//#endregion
