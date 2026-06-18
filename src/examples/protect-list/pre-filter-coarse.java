package com.example.kessel;

import java.util.ArrayList;
import java.util.List;

import org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;
import org.project_kessel.api.inventory.v1beta2.ClientBuilder;
import org.project_kessel.api.inventory.v1beta2.StreamedListObjectsResponse;
import org.project_kessel.api.rbac.v2.ListWorkspaces;
import org.project_kessel.api.rbac.v2.Utils;

//#region setup
public class PreFilterCoarse {
    private final KesselInventoryServiceBlockingStub kesselClient;

    public PreFilterCoarse() {
        // Note: For proper cleanup, store the Pair and call channel.shutdown() when done
        this.kesselClient = new ClientBuilder("localhost:9000")
            .insecure()
            .build()
            .getLeft();
    }
//#endregion

//#region get-workspaces
    /**
     * Get all workspaces the user can access with the given permission.
     *
     * This uses the ListWorkspaces helper from kessel.rbac.v2 which
     * handles StreamedListObjects pagination automatically.
     */
    public List<String> getAccessibleWorkspaces(String userId, String permission) {
        List<String> workspaceIds = new ArrayList<>();

        Iterable<StreamedListObjectsResponse> workspaces = ListWorkspaces.listWorkspaces(
            kesselClient,
            Utils.principalSubject(userId, "redhat"),
            permission
        );

        for (StreamedListObjectsResponse response : workspaces) {
            workspaceIds.add(response.getObject().getResourceId());
        }

        return workspaceIds;
    }
//#endregion

//#region filter-query
    /**
     * List integrations the user can access.
     *
     * Pre-filtering: Get allowed workspaces first, then query only those.
     */
    public List<Integration> listIntegrations(Database db, String userId) {
        // Step 1: Get workspaces the user can access
        List<String> allowedWorkspaces = getAccessibleWorkspaces(userId, "myservice_integration_view");

        if (allowedWorkspaces.isEmpty()) {
            return List.of();
        }

        // Step 2: Query database with workspace filter
        String sql = "SELECT * FROM integrations WHERE workspace_id = ANY(?)";
        return db.query(sql, allowedWorkspaces);
    }

    // Database interface placeholder
    interface Database {
        List<Integration> query(String sql, List<String> params);
    }

    static class Integration {
        String id;
        String name;
        String workspaceId;
    }
//#endregion
}
