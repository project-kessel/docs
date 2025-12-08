---
language: "Python"
order: 20
---
### Import client

```bash
pip install kessel-sdk
```

#### Basic Client Setup

```python
from kessel.inventory.v1beta2 import ClientBuilder

# Your Kessel Inventory gRPC Endpoint
KESSEL_ENDPOINT = "localhost:9081"

# For insecure local development:
stub, channel = ClientBuilder(KESSEL_ENDPOINT).insecure().build()
```

#### Auth Client Setup

Install the SDK with auth dependencies:
```bash
pip install "kessel-sdk[auth]"
```

```python
from kessel.auth import fetch_oidc_discovery, OAuth2ClientCredentials
from kessel.inventory.v1beta2 import ClientBuilder

# Your Kessel Inventory gRPC Endpoint
KESSEL_ENDPOINT = "localhost:9081"

# Fetch OIDC discovery information
discovery = fetch_oidc_discovery(ISSUER_URL)

# Create OAuth2 credentials
auth_credentials = OAuth2ClientCredentials(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    token_endpoint=discovery.token_endpoint,
)

# Build authenticated client
stub, channel = ClientBuilder(KESSEL_ENDPOINT).oauth2_client_authenticated(auth_credentials).build()
```


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

## Creating Check Requests

Build a permission check request:

```python
from kessel.inventory.v1beta2 import (
    subject_reference_pb2,
    resource_reference_pb2,
    reporter_reference_pb2,
    check_request_pb2,
)

# Prepare the subject reference object (who is requesting access)
subject = subject_reference_pb2.SubjectReference(
    resource=resource_reference_pb2.ResourceReference(
        reporter=reporter_reference_pb2.ReporterReference(type="rbac"),
        resource_id="sarah",
        resource_type="principal",
    )
)

# Prepare the resource reference object (what is being accessed)
resource_ref = resource_reference_pb2.ResourceReference(
    resource_id="doc-123",
    resource_type="document",
    reporter=reporter_reference_pb2.ReporterReference(type="drive"),
)

# Build the complete check request
check_request = check_request_pb2.CheckRequest(
    subject=subject,
    relation="view",
    object=resource_ref,
)
```

## Sending Check Requests

Execute the check request and handle the response:

```python
import grpc

try:
    check_response = stub.Check(check_request)
    print("Check response received successfully")
    print(check_response)
except grpc.RpcError as e:
    print("gRPC error occurred during Check:")
    print(f"Code: {e.code()}")
    print(f"Details: {e.details()}")
```

## Complete Example

```python
import os
import grpc
from google.protobuf import struct_pb2
from kessel.auth import fetch_oidc_discovery, OAuth2ClientCredentials
from kessel.inventory.v1beta2 import (
    ClientBuilder,
    subject_reference_pb2,
    resource_reference_pb2,
    reporter_reference_pb2,
    check_request_pb2,
    report_resource_request_pb2,
    resource_representations_pb2,
    representation_metadata_pb2,
)

# Your Kessel Inventory gRPC endpoint
KESSEL_ENDPOINT = "localhost:9081"

def run():
    # For authenticated environments, uncomment and configure the following:
    # discovery = fetch_oidc_discovery(ISSUER_URL)
    # auth_credentials = OAuth2ClientCredentials(
    #     client_id=CLIENT_ID,
    #     client_secret=CLIENT_SECRET,
    #     token_endpoint=discovery.token_endpoint,
    # )
    # stub, channel = ClientBuilder(KESSEL_ENDPOINT).oauth2_client_authenticated(auth_credentials).build()

    # For insecure local development:
    stub, channel = ClientBuilder(KESSEL_ENDPOINT).insecure().build()

    with channel:
        # 1) Report a resource first
        common_struct = struct_pb2.Struct()
        common_struct.update({"workspace_id": "workspace-1"})

        reporter_struct = struct_pb2.Struct()
        reporter_struct.update({
            "document_id": "doc-123",
            "document_name": "My Important Document",
            "document_type": "document",
            "created_at": "2025-08-31T10:30:00Z",
            "file_size": 2048576,
            "owner_id": "user-1",
        })

        metadata = representation_metadata_pb2.RepresentationMetadata(
            local_resource_id="doc-123",
            api_href="https://drive.example.com/document/123",
            console_href="https://www.console.com/drive/documents",
            reporter_version="2.7.16",
        )

        representations = resource_representations_pb2.ResourceRepresentations(
            metadata=metadata,
            common=common_struct,
            reporter=reporter_struct,
        )

        report_req = report_resource_request_pb2.ReportResourceRequest(
            type="document",
            reporter_type="drive",
            reporter_instance_id="drive-1",
            representations=representations,
        )
        _ = stub.ReportResource(report_req)

        # 2) Then perform a permission check
        subject = subject_reference_pb2.SubjectReference(
            resource=resource_reference_pb2.ResourceReference(
                reporter=reporter_reference_pb2.ReporterReference(type="rbac"),
                resource_id="sarah",
                resource_type="principal",
            )
        )

        resource_ref = resource_reference_pb2.ResourceReference(
            resource_id="doc-123",
            resource_type="document",
            reporter=reporter_reference_pb2.ReporterReference(type="drive"),
        )

        check_request = check_request_pb2.CheckRequest(
            subject=subject,
            relation="view",
            object=resource_ref,
        )

        try:
            check_response = stub.Check(check_request)
            print("Check response received successfully")
            print(check_response)
        except grpc.RpcError as e:
            print("gRPC error occurred during Check:")
            print(f"Code: {e.code()}")
            print(f"Details: {e.details()}")


if __name__ == "__main__":
    run()
```
