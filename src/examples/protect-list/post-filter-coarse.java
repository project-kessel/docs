package com.example.kessel;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.project_kessel.api.inventory.v1beta2.*;
import org.project_kessel.api.rbac.v2.Utils;

import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;

//#region setup
public class PostFilterCoarse {
    private final KesselInventoryServiceBlockingStub kesselClient;

    public PostFilterCoarse() {
        // Note: For proper cleanup, store the Pair and call channel.shutdown() when done
        this.kesselClient = new ClientBuilder("localhost:9000")
            .insecure()
            .build()
            .getLeft();
    }
//#endregion

//#region filter-by-workspace
    /**
     * Filter integrations by checking workspace permissions.
     *
     * Post-filtering (coarse): Check workspace-level permissions for unique workspaces.
     */
    public List<Integration> filterByWorkspacePermission(
            List<Integration> integrations,
            String userId,
            String permission) {

        // Step 1: Get unique workspace IDs
        Set<String> workspaceSet = new HashSet<>();
        for (Integration integration : integrations) {
            workspaceSet.add(integration.workspaceId);
        }
        List<String> workspaceIDs = new ArrayList<>(workspaceSet);

        // Step 2: Check workspace permissions with CheckBulk
        CheckBulkRequest.Builder requestBuilder = CheckBulkRequest.newBuilder();
        for (String wsId : workspaceIDs) {
            CheckBulkRequestItem item = CheckBulkRequestItem.newBuilder()
                .setObject(Utils.workspaceResource(wsId))
                .setRelation(permission)
                .setSubject(Utils.principalSubject(userId, "redhat"))
                .build();
            requestBuilder.addItems(item);
        }

        CheckBulkResponse response = kesselClient.checkBulk(requestBuilder.build());

        // Step 3: Build set of allowed workspaces
        Set<String> allowedWorkspaces = new HashSet<>();
        for (int index = 0; index < response.getPairsCount(); index++) {
            CheckBulkResponsePair pair = response.getPairs(index);
            if (pair.hasItem() && pair.getItem().getAllowed() == Allowed.ALLOWED_TRUE) {
                allowedWorkspaces.add(workspaceIDs.get(index));
            }
        }

        // Step 4: Filter resources by allowed workspaces
        List<Integration> accessibleIntegrations = new ArrayList<>();
        for (Integration integration : integrations) {
            if (allowedWorkspaces.contains(integration.workspaceId)) {
                accessibleIntegrations.add(integration);
            }
        }

        return accessibleIntegrations;
    }
//#endregion

//#region full-example
    /**
     * List integrations the user can access.
     *
     * Post-filtering (coarse): Query all integrations, then check workspace permissions.
     */
    public List<Integration> listIntegrations(Database db, String userId) {
        // Step 1: Query database
        List<Integration> allIntegrations = db.query("SELECT * FROM integrations WHERE status = 'active'");

        // Step 2: Filter by workspace permission
        return filterByWorkspacePermission(
            allIntegrations,
            userId,
            "myservice_integration_view"
        );
    }

    // Database interface placeholder
    interface Database {
        List<Integration> query(String sql);
    }

    static class Integration {
        String id;
        String name;
        String workspaceId;
    }
//#endregion
}
