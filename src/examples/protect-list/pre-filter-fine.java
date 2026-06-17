package com.example.kessel;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.project_kessel.api.inventory.v1beta2.*;
import org.project_kessel.api.rbac.v2.Utils;

import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;

//#region setup
public class PreFilterFine {
    private final KesselInventoryServiceBlockingStub kesselClient;

    public PreFilterFine() {
        // Note: For proper cleanup, store the Pair and call channel.shutdown() when done
        this.kesselClient = new ClientBuilder("localhost:9000")
            .insecure()
            .build()
            .getLeft();
    }
//#endregion

//#region get-resource-ids
    /**
     * Get all resource IDs the user can access with the given permission.
     *
     * This uses StreamedListObjects with your specific resource type to find
     * exactly which resource IDs the user can access.
     */
    public List<String> getAccessibleResourceIDs(String userId, String permission) {
        SubjectReference subject = Utils.principalSubject(userId, "redhat");
        RepresentationType resourceType = RepresentationType.newBuilder()
            .setResourceType("integration")
            .setReporterType("myservice")
            .build();

        StreamedListObjectsRequest request = StreamedListObjectsRequest.newBuilder()
            .setObjectType(resourceType)
            .setRelation(permission)
            .setSubject(subject)
            .build();

        // Get accessible resource IDs
        List<String> resourceIDs = new ArrayList<>();
        Iterator<StreamedListObjectsResponse> responses = kesselClient.streamedListObjects(request);
        while (responses.hasNext()) {
            StreamedListObjectsResponse response = responses.next();
            resourceIDs.add(response.getObject().getResourceId());
        }

        return resourceIDs;
    }
//#endregion

//#region filter-query
    /**
     * List integrations the user can access.
     *
     * Pre-filtering (fine-grained): Get allowed resource IDs first, then query only those.
     */
    public List<Integration> listIntegrations(Database db, String userId) {
        // Step 1: Get resource IDs the user can access
        List<String> allowedIDs = getAccessibleResourceIDs(userId, "view");

        if (allowedIDs.isEmpty()) {
            return List.of();
        }

        // Step 2: Query database with resource ID filter
        String sql = "SELECT * FROM integrations WHERE id = ANY(?)";
        return db.query(sql, allowedIDs);
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
