package main

import (
	"context"
	"fmt"
	"io"

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

//#region get-resource-ids
// getAccessibleResourceIDs gets all resource IDs the user can access with the given permission.
//
// This uses StreamedListObjects with your specific resource type to find
// exactly which resource IDs the user can access.
func getAccessibleResourceIDs(
	ctx context.Context,
	client v1beta2.KesselInventoryServiceClient,
	userID string,
	permission string,
) ([]string, error) {
    subject := v2.PrincipalSubject(userID, "redhat")
	reporterType := "myservice"
	resourceType := &v1beta2.RepresentationType{
		ResourceType: "integration",
		ReporterType: &reporterType,
	}

	request := &v1beta2.StreamedListObjectsRequest{
		ObjectType: resourceType,
		Relation:   permission,
		Subject:    subject,
	}

	stream, err := client.StreamedListObjects(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to start stream: %w", err)
	}

	// Get accessible resource IDs
	var resourceIDs []string
	for {
		response, err := stream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error receiving from stream: %w", err)
		}
		resourceIDs = append(resourceIDs, response.Object.ResourceId)
	}

	return resourceIDs, nil
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
	Query(query string, params ...interface{}) ([]*Integration, error)
}

// listIntegrations returns integrations the user can access.
//
// Pre-filtering (fine-grained): Get allowed resource IDs first, then query only those.
func listIntegrations(ctx context.Context, client v1beta2.KesselInventoryServiceClient, db Database, userID string) ([]*Integration, error) {
	// Step 1: Get resource IDs the user can access
	allowedIDs, err := getAccessibleResourceIDs(ctx, client, userID, "view")
	if err != nil {
		return nil, err
	}

	if len(allowedIDs) == 0 {
		return []*Integration{}, nil
	}

	// Step 2: Query database with resource ID filter
	query := "SELECT id, name, workspace_id FROM integrations WHERE id = ANY($1)"
	integrations, err := db.Query(query, allowedIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to query integrations: %w", err)
	}

	return integrations, nil
}

//#endregion
