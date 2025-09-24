---
language: "Python"
order: 20
---
## Creating Report Resource Requests

Build a ReportResource Request:

```python
from google.protobuf import struct_pb2
from kessel.inventory.v1beta2 import (
    report_resource_request_pb2,
    resource_representations_pb2,
    representation_metadata_pb2,
)

# Build protobuf Struct for common metadata
common_struct = struct_pb2.Struct()
common_struct.update({"workspace_id": "workspace-1"})

# Build protobuf Struct for reporter-specific data
reporter_struct = struct_pb2.Struct()
reporter_struct.update({
    "document_id": "doc-123",
    "document_name": "My Important Document",
    "document_type": "document",
    "created_at": "2025-08-31T10:30:00Z",
    "file_size": 2048576,
    "owner_id": "user-1",
})

# Create metadata for the resource representation
metadata = representation_metadata_pb2.RepresentationMetadata(
    local_resource_id="doc-123",
    api_href="https://drive.example.com/document/123",
    console_href="https://www.console.com/drive/documents",
    reporter_version="2.7.16",
)

# Build the resource representations
representations = resource_representations_pb2.ResourceRepresentations(
    metadata=metadata, common=common_struct, reporter=reporter_struct
)

# Create the report request
request = report_resource_request_pb2.ReportResourceRequest(
    type="document",
    reporter_type="drive",
    reporter_instance_id="drive-1",
    representations=representations,
)
```

## Sending Report Resource Requests

Execute the report resource request and handle the response:

```python
import grpc

try:
    response = stub.ReportResource(request)
    print("Resource reported successfully")
except grpc.RpcError as e:
    print("gRPC error occurred during ReportResource:")
    print(f"Code: {e.code()}")
    print(f"Details: {e.details()}")
```
