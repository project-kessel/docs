---
language: "Python"
order: 20
---

```python
import grpc
from google.protobuf import struct_pb2
from kessel.inventory.v1beta2 import (
    inventory_service_pb2_grpc,
    report_resource_request_pb2,
    resource_representations_pb2,
    representation_metadata_pb2,
)

stub = inventory_service_pb2_grpc.KesselInventoryServiceStub(
    grpc.insecure_channel("localhost:9000")
)

# Build protobuf Struct for common metadata
common_struct = struct_pb2.Struct()
common_struct.update({"workspace_id": "6eb10953-4ec9-4feb-838f-ba43a60880bf"})

# Build protobuf Struct for reporter-specific data
reporter_struct = struct_pb2.Struct()
reporter_struct.update(
    {
        "satellite_id": "ca234d8f-9861-4659-a033-e80460b2801c",
        "sub_manager_id": "e9b7d65f-3f81-4c26-b86c-2db663376eed",
        "insights_inventory_id": "c4b9b5e7-a82a-467a-b382-024a2f18c129",
        "ansible_host": "host-1",
    }
)

# Create metadata for the resource representation
metadata = representation_metadata_pb2.RepresentationMetadata(
    local_resource_id="854589f0-3be7-4cad-8bcd-45e18f33cb81",
    api_href="https://apiHref.com/",
    console_href="https://www.consoleHref.com/",
    reporter_version="0.2.11",
)

# Build the resource representations
representations = resource_representations_pb2.ResourceRepresentations(
    metadata=metadata, common=common_struct, reporter=reporter_struct
)

# Create the report request
request = report_resource_request_pb2.ReportResourceRequest(
    type="host",
    reporter_type="hbi",
    reporter_instance_id="0a2a430e-1ad9-4304-8e75-cc6fd3b5441a",
    representations=representations,
)

try:
    response = stub.ReportResource(request)
    print("Resource reported successfully")
except grpc.RpcError as e:
    print(f"Error reporting resource: {e.details()}")
```
