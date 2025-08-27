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
    try:
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
            # Build protobuf Struct for common metadata
            common_struct = struct_pb2.Struct()
            common_struct.update({"workspace_id": "a64d17d0-aec3-410a-acd0-e0b85b22c076"})

            # Build protobuf Struct for reporter-specific data
            reporter_struct = struct_pb2.Struct()
            reporter_struct.update(
                {
                    "satellite_id": "ca234d8f-9861-4659-a033-e80460b2801c",
                    "sub_manager_id": "e9b7d65f-3f81-4c26-b86c-2db663376eed",
                    "insights_inventory_id": "05707922-7b0a-4fe6-982d-6adbc7695b8f",
                    "ansible_host": "host-1",
                }
            )

            # Create metadata for the resource representation
            metadata = representation_metadata_pb2.RepresentationMetadata(
                local_resource_id="dd1b73b9-3e33-4264-968c-e3ce55b9afec",
                api_href="https://apiHref.com/",
                console_href="https://www.console.com/",
                reporter_version="2.7.16",
            )

            # Build the resource representations
            representations = resource_representations_pb2.ResourceRepresentations(
                metadata=metadata, common=common_struct, reporter=reporter_struct
            )

            # Create the report request
            request = report_resource_request_pb2.ReportResourceRequest(
                type="host",
                reporter_type="hbi",
                reporter_instance_id="3088be62-1c60-4884-b133-9200542d0b3f",
                representations=representations,
            )

            response = stub.ReportResource(request)
            print("Resource reported successfully")

    except grpc.RpcError as e:
        print("gRPC error occurred during ReportResource:")
        print(f"Code: {e.code()}")
        print(f"Details: {e.details()}")


if __name__ == "__main__":
    run()
```
