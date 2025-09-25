---
language: "Java"
order: 60
---

## Creating Check Requests

Build a permission check request:

```java
import org.project_kessel.api.inventory.v1beta2.CheckRequest;
import org.project_kessel.api.inventory.v1beta2.ResourceReference;
import org.project_kessel.api.inventory.v1beta2.ReporterReference;
import org.project_kessel.api.inventory.v1beta2.SubjectReference;

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
```

## Sending Check Requests

Execute the check request and handle the response:

```java
import com.nimbusds.jose.util.Pair;
import io.grpc.ManagedChannel;
import io.grpc.StatusRuntimeException;
import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;
import org.project_kessel.api.inventory.v1beta2.ClientBuilder;
import org.project_kessel.api.inventory.v1beta2.CheckResponse;

try {
    CheckResponse response = client.check(checkRequest);
    System.out.println("Check response received successfully:");
    System.out.println(response);
} catch (StatusRuntimeException statusException) {
    System.out.println("gRPC error occurred during Check:");
    statusException.printStackTrace();
} finally {
    clientAndChannel.getRight().shutdown();
}
```

## Complete Example

```java
import com.google.protobuf.Struct;
import com.google.protobuf.Value;
import com.nimbusds.jose.util.Pair;
import io.grpc.ManagedChannel;
import io.grpc.StatusRuntimeException;
import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;
import org.project_kessel.api.inventory.v1beta2.*;

public class EndToEndExample {
    public static void main(String[] args) {
        String kesselEndpoint = System.getenv().getOrDefault("KESSEL_ENDPOINT", "localhost:9000");

        Pair<KesselInventoryServiceBlockingStub, ManagedChannel> clientAndChannel =
            new ClientBuilder(kesselEndpoint)
                .insecure()
                .build();
        KesselInventoryServiceBlockingStub client = clientAndChannel.getLeft();

        try {
            // 1) Report a resource first
            ReportResourceRequest reportResourceRequest = ReportResourceRequest
                .newBuilder()
                .setType("document")
                .setReporterType("drive")
                .setReporterInstanceId("drive-1")
                .setRepresentations(
                    ResourceRepresentations
                        .newBuilder()
                        .setMetadata(
                            RepresentationMetadata
                                .newBuilder()
                                .setLocalResourceId("doc-123")
                                .setApiHref("https://drive.example.com/document/123")
                                .setConsoleHref("https://www.console.com/drive/documents")
                                .setReporterVersion("2.7.16")
                                .build()
                        )
                        .setCommon(
                            Struct
                                .newBuilder()
                                .putFields("workspace_id", Value.newBuilder().setStringValue("workspace-1").build())
                                .build()
                        )
                        .setReporter(
                            Struct
                                .newBuilder()
                                .putFields("document_id", Value.newBuilder().setStringValue("doc-123").build())
                                .putFields("document_name", Value.newBuilder().setStringValue("My Important Document").build())
                                .putFields("document_type", Value.newBuilder().setStringValue("document").build())
                                .putFields("created_at", Value.newBuilder().setStringValue("2025-08-31T10:30:00Z").build())
                                .putFields("file_size", Value.newBuilder().setNumberValue(2048576).build())
                                .putFields("owner_id", Value.newBuilder().setStringValue("user-1").build())
                                .build()
                        )
                        .build()
                )
                .build();

            _ = client.reportResource(reportResourceRequest);

            // 2) Then perform a permission check
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
        } catch (StatusRuntimeException statusException) {
            System.out.println("gRPC error occurred during Check:");
            statusException.printStackTrace();
        } finally {
            clientAndChannel.getRight().shutdown();
        }
    }
}
```
