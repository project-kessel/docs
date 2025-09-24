---
language: "Go"
order: 30
---
## Creating Report Resource Requests

Build a ReportResource Request:

```go
import "google.golang.org/protobuf/types/known/structpb"

reportResourceRequest := &v1beta2.ReportResourceRequest{
    Type:               "document",
    ReporterType:       "drive",
    ReporterInstanceId: "drive-1",
    Representations: &v1beta2.ResourceRepresentations{
        Metadata: &v1beta2.RepresentationMetadata{
            LocalResourceId: "doc-123",
            ApiHref:         "https://drive.example.com/document/123",
            ConsoleHref:     addr("https://www.console.com/drive/documents"),
            ReporterVersion: addr("2.7.16"),
        },
        Common: &structpb.Struct{
            Fields: map[string]*structpb.Value{
                "workspace_id": structpb.NewStringValue("workspace-1"),
            },
        },
        Reporter: &structpb.Struct{
            Fields: map[string]*structpb.Value{
                "document_id":    structpb.NewStringValue("doc-123"),
                "document_name":  structpb.NewStringValue("My Important Document"),
                "document_type":  structpb.NewStringValue("document"),
                "created_at":     structpb.NewStringValue("2025-08-31T10:30:00Z"),
                "file_size":      structpb.NewNumberValue(2048576),
                "owner_id":       structpb.NewStringValue("user-1"),
            },
        },
    },
}

func addr[T any](t T) *T { return &t }
```

## Sending Report Resource Requests

Execute the report resource request and handle the response:

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

fmt.Println("Making report resource request:")

response, err := inventoryClient.ReportResource(ctx, reportResourceRequest)
if err != nil {
    if st, ok := status.FromError(err); ok {
        switch st.Code() {
        case codes.Unavailable:
            log.Fatal("Service unavailable: ", err)
        case codes.PermissionDenied:
            log.Fatal("Permission denied: ", err)
        default:
            log.Fatal("gRPC connection error: ", err)
        }
    } else {
        log.Fatal("Unknown error: ", err)
    }
}
fmt.Printf("Report resource response: %+v\n", response)
```
