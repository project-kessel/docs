package com.example.kessel;

import java.util.ArrayList;
import java.util.List;

import org.project_kessel.api.inventory.v1beta2.*;
import org.project_kessel.api.rbac.v2.Utils;

import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;

//#region setup
public class PostFilterBulk {
    private final KesselInventoryServiceBlockingStub kesselClient;

    public PostFilterBulk() {
        // Note: For proper cleanup, store the Pair and call channel.shutdown() when done
        this.kesselClient = new ClientBuilder("localhost:9000")
            .insecure()
            .build()
            .getLeft();
    }
//#endregion

//#region bulk-check
    /**
     * Filter integrations using CheckBulk to batch permission checks.
     *
     * This is more efficient than calling Check() in a loop.
     */
    public List<Integration> filterIntegrationsByPermission(
            List<Integration> integrations,
            String userId,
            String permission) {

        // Build bulk check request with one item per integration
        CheckBulkRequest.Builder requestBuilder = CheckBulkRequest.newBuilder();
        for (Integration integration : integrations) {
            CheckBulkRequestItem item = CheckBulkRequestItem.newBuilder()
                .setObject(Utils.workspaceResource(integration.workspaceId))
                .setRelation(permission)
                .setSubject(Utils.principalSubject(userId, "redhat"))
                .build();
            requestBuilder.addItems(item);
        }

        // Make single API call to check all permissions
        CheckBulkResponse response = kesselClient.checkBulk(requestBuilder.build());

        // Filter integrations based on bulk check results
        List<Integration> accessibleIntegrations = new ArrayList<>();
        for (int index = 0; index < response.getPairsCount(); index++) {
            CheckBulkResponsePair pair = response.getPairs(index);
            if (pair.hasItem() && pair.getItem().getAllowed() == Allowed.ALLOWED_TRUE) {
                accessibleIntegrations.add(integrations.get(index));
            }
        }

        return accessibleIntegrations;
    }
//#endregion

//#region full-example
    /**
     * List integrations the user can access.
     *
     * Post-filtering with CheckBulk: Query all integrations, then batch-check permissions.
     */
    public List<Integration> listIntegrations(Database db, String userId) {
        // Step 1: Query all integrations from database
        List<Integration> allIntegrations = db.query("SELECT * FROM integrations");

        // Step 2: Use CheckBulk to filter by permission
        return filterIntegrationsByPermission(
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
