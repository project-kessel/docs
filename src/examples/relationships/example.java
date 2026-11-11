import com.google.protobuf.Struct;
import com.google.protobuf.Value;
import com.nimbusds.jose.util.Pair;
import io.grpc.ManagedChannel;
import io.grpc.StatusRuntimeException;
import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;
import org.project_kessel.api.inventory.v1beta2.*;

public class Example {
    public static void main(String[] args) {
        //#region setup
        String kesselEndpoint = System.getenv().getOrDefault("KESSEL_ENDPOINT", "localhost:9081");

        Pair<KesselInventoryServiceBlockingStub, ManagedChannel> clientAndChannel =
            new ClientBuilder(kesselEndpoint)
                .insecure()
                .build();
        KesselInventoryServiceBlockingStub client = clientAndChannel.getLeft();
        //#endregion

        try {
            //#region create
            // Add a workspace relationship to a document that has not been
            // reported yet: the resource is created with the provided
            // relationship values.
            AddResourceRelationshipsRequest createRequest = AddResourceRelationshipsRequest
                .newBuilder()
                .setType("document")
                .setReporterType("drive")
                .setReporterInstanceId("drive-1")
                .setLocalResourceId("doc-456")
                .setCommon(
                    Struct
                        .newBuilder()
                        .putFields("workspace_id", Value.newBuilder().setStringValue("workspace-2").build())
                        .build()
                )
                .build();

            client.addResourceRelationships(createRequest);
            //#endregion

            //#region remove
            // First step of changing a single-valued relationship: remove the
            // existing value. Removing a value that is not present is an
            // idempotent no-op.
            RemoveResourceRelationshipsRequest removeRequest = RemoveResourceRelationshipsRequest
                .newBuilder()
                .setType("document")
                .setReporterType("drive")
                .setReporterInstanceId("drive-1")
                .setLocalResourceId("doc-123")
                .setCommon(
                    Struct
                        .newBuilder()
                        .putFields("workspace_id", Value.newBuilder().setStringValue("workspace-1").build())
                        .build()
                )
                .build();

            client.removeResourceRelationships(removeRequest);
            //#endregion

            //#region add
            // Second step of changing a single-valued relationship: add the
            // replacement value. Adding a second value without removing the
            // existing one first is rejected with INVALID_ARGUMENT.
            AddResourceRelationshipsRequest addRequest = AddResourceRelationshipsRequest
                .newBuilder()
                .setType("document")
                .setReporterType("drive")
                .setReporterInstanceId("drive-1")
                .setLocalResourceId("doc-123")
                .setCommon(
                    Struct
                        .newBuilder()
                        .putFields("workspace_id", Value.newBuilder().setStringValue("workspace-2").build())
                        .build()
                )
                .build();

            client.addResourceRelationships(addRequest);
            //#endregion

            //#region check
            // NOTE: You may need to wait for replication and caches to update.
            CheckRequest checkRequest = CheckRequest
                .newBuilder()
                .setObject(
                    ResourceReference
                        .newBuilder()
                        .setReporter(ReporterReference.newBuilder().setType("drive").build())
                        .setResourceId("doc-123")
                        .setResourceType("document")
                        .build()
                )
                .setRelation("view")
                .setSubject(
                    SubjectReference
                        .newBuilder()
                        .setResource(
                            ResourceReference
                                .newBuilder()
                                .setReporter(ReporterReference.newBuilder().setType("rbac").build())
                                .setResourceId("sarah")
                                .setResourceType("principal")
                                .build()
                        )
                        .build()
                )
                .build();

            CheckResponse response = client.check(checkRequest);
            System.out.println("Check response received successfully:");
            System.out.println(response);
            //#endregion
        } catch (StatusRuntimeException statusException) {
            System.out.println("gRPC error occurred:");
            statusException.printStackTrace();
        } finally {
            clientAndChannel.getRight().shutdown();
        }
    }
}
