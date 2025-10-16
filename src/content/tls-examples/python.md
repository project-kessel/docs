---
language: "Python"
order: 20
---

### Configure TLS Transport Credentials

```python
import grpc

def configure_tls(ca_cert_path: str) -> grpc.ChannelCredentials:
    """Load CA certificate and create TLS credentials."""
    with open(ca_cert_path, 'rb') as f:
        ca_cert = f.read()
    return grpc.ssl_channel_credentials(root_certificates=ca_cert)
```

### Combine TLS with OAuth2

```python
from kessel.auth import OAuth2ClientCredentials
from kessel.grpc import oauth2_call_credentials
from kessel.inventory.v1beta2 import ClientBuilder

# Configure OAuth 2.0 credentials
auth_credentials = OAuth2ClientCredentials(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    token_url=TOKEN_ENDPOINT,
)

# Configure TLS transport credentials
ssl_credentials = configure_tls("/ca-certs/service-ca.crt")

# Build authenticated client with TLS
stub, channel = ClientBuilder(os.getenv("KESSEL_ENDPOINT")).oauth2_client_authenticated(auth_credentials, ssl_credentials).build()
```

### Complete Example

```python
import os
import grpc
from google.protobuf import struct_pb2
from kessel.auth import OAuth2ClientCredentials
from kessel.grpc import oauth2_call_credentials
from kessel.inventory.v1beta2 import (
    ClientBuilder,
    report_resource_request_pb2,
    resource_representations_pb2,
    representation_metadata_pb2,
)

def configure_tls(ca_cert_path: str) -> grpc.ChannelCredentials:
    """Load CA certificate and create TLS credentials."""
    with open(ca_cert_path, 'rb') as f:
        ca_cert = f.read()
    return grpc.ssl_channel_credentials(root_certificates=ca_cert)

def main():
    # Configure OAuth 2.0 credentials
    discovery = fetch_oidc_discovery(ISSUER_URL)
    token_endpoint = discovery.token_endpoint

    # Create OAuth2 credentials with the discovered token endpoint
    auth_credentials = OAuth2ClientCredentials(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        token_endpoint=token_endpoint,
    )

    # Configure TLS transport credentials
    ssl_credentials = configure_tls("/ca-certs/service-ca.crt")

    # Build authenticated client with TLS
    stub, channel = ClientBuilder(os.getenv("KESSEL_ENDPOINT")).oauth2_client_authenticated(auth_credentials, ssl_credentials).build()

    with channel:
        # Example: Report a resource
        common_struct = struct_pb2.Struct()
        common_struct.update({"workspace_id": "workspace-1"})

        metadata = representation_metadata_pb2.RepresentationMetadata(
            local_resource_id="doc-123",
            api_href="https://drive.example.com/document/123",
        )

        representations = resource_representations_pb2.ResourceRepresentations(
            metadata=metadata,
            common=common_struct,
        )

        report_req = report_resource_request_pb2.ReportResourceRequest(
            type="document",
            reporter_type="drive",
            reporter_instance_id="drive-1",
            representations=representations,
        )

        try:
            response = stub.ReportResource(report_req)
            print("Successfully reported resource")
            print(response)
        except grpc.RpcError as e:
            print(f"gRPC error: {e.code()} - {e.details()}")

if __name__ == "__main__":
    main()
```

