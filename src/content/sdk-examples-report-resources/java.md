---
language: "Java"
order: 60
---

## Building Resource Representations

Build a `ReportResourceRequest`

```java
import com.google.protobuf.Struct;
import com.google.protobuf.Value;
import org.project_kessel.api.inventory.v1beta2.ReportResourceRequest;
import org.project_kessel.api.inventory.v1beta2.ResourceRepresentations;
import org.project_kessel.api.inventory.v1beta2.RepresentationMetadata;

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
```

## Sending Report Requests

Send the report request and handle errors:

```java
import com.nimbusds.jose.util.Pair;
import io.grpc.ManagedChannel;
import io.grpc.StatusRuntimeException;
import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;
import org.project_kessel.api.inventory.v1beta2.ClientBuilder;
import org.project_kessel.api.inventory.v1beta2.ReportResourceResponse;

try {
    ReportResourceResponse response = client.reportResource(reportResourceRequest);
    System.out.println("Report resource response received successfully:");
    System.out.println(response);
} catch (StatusRuntimeException statusException) {
    System.out.println("gRPC error occurred during Report resource:");
    statusException.printStackTrace();
} finally {
    clientAndChannel.getRight().shutdown();
}
```

 
