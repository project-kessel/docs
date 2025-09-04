---
language: "Python"
order: 20
---

## Basic Client Setup

Create a basic Kessel client for local development:

```python
from kessel.inventory.v1beta2 import ClientBuilder

# For insecure local development:
stub, channel = ClientBuilder(KESSEL_ENDPOINT).insecure().build()
```

## Auth Client Setup

Set up an authenticated client for production environments:

```python
from kessel.auth import fetch_oidc_discovery, OAuth2ClientCredentials
from kessel.inventory.v1beta2 import ClientBuilder

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
)

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
        # Prepare the subject reference object
        subject = subject_reference_pb2.SubjectReference(
            resource=resource_reference_pb2.ResourceReference(
                reporter=reporter_reference_pb2.ReporterReference(type="rbac"),
                resource_id="sarah",
                resource_type="principal",
            )
        )

        # Prepare the resource reference object
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
