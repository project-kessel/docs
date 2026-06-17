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

//#region bulk-check
// Integration represents an integration in your database
type Integration struct {
	ID          string
	Name        string
	WorkspaceID string
}

// filterIntegrationsByPermission filters integrations using CheckBulk to batch permission checks.
//
// This is more efficient than calling Check() in a loop.
func filterIntegrationsByPermission(
	ctx context.Context,
	client v1beta2.KesselInventoryServiceClient,
	integrations []*Integration,
	userID string,
	permission string,
) ([]*Integration, error) {
	// Build bulk check request with one item per integration
	var items []*v1beta2.CheckBulkRequestItem
	for _, integration := range integrations {
		item := &v1beta2.CheckBulkRequestItem{
			Object:   v2.WorkspaceResource(integration.WorkspaceID),
			Relation: permission,
			Subject:  v2.PrincipalSubject(userID, "redhat"),
		}
		items = append(items, item)
	}

	request := &v1beta2.CheckBulkRequest{Items: items}

	// Make single API call to check all permissions
	response, err := client.CheckBulk(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to check bulk: %w", err)
	}

	// Filter integrations based on bulk check results
	var accessibleIntegrations []*Integration
	for index, pair := range response.Pairs {
		if pair.Item != nil && pair.Item.Allowed == v1beta2.Allowed_ALLOWED_TRUE {
			accessibleIntegrations = append(accessibleIntegrations, integrations[index])
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
// Post-filtering with CheckBulk: Query all integrations, then batch-check permissions.
func listIntegrations(ctx context.Context, client v1beta2.KesselInventoryServiceClient, db Database, userID string) ([]*Integration, error) {
	// Step 1: Query all integrations from database
	allIntegrations, err := db.Query("SELECT * FROM integrations")
	if err != nil {
		return nil, fmt.Errorf("failed to query integrations: %w", err)
	}

	// Step 2: Use CheckBulk to filter by permission
	accessible, err := filterIntegrationsByPermission(
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
