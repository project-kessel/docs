---
language: "Python"
order: 20
---

```python
import os
import grpc
from google.protobuf import struct_pb2
from kessel.auth import fetch_oidc_discovery, OAuth2ClientCredentials
from kessel.inventory.v1beta2 import (
    ClientBuilder,
    report_resource_request_pb2,
    resource_representations_pb2,
    representation_metadata_pb2,
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
                resource_id="bob",
                resource_type="principal",
            )
        )

        # Prepare the resource reference object
        resource_ref = resource_reference_pb2.ResourceReference(
            resource_id="bob_club",
            resource_type="group",
            reporter=reporter_reference_pb2.ReporterReference(type="rbac"),
        )

        check_request = check_request_pb2.CheckRequest(
            subject=subject,
            relation="member",
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
