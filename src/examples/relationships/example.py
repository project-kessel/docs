import grpc
from google.protobuf import struct_pb2
from kessel.inventory.v1beta2 import (
    ClientBuilder,
    subject_reference_pb2,
    resource_reference_pb2,
    reporter_reference_pb2,
    check_request_pb2,
    add_resource_relationships_request_pb2,
    remove_resource_relationships_request_pb2,
)

KESSEL_ENDPOINT = "localhost:9081"


def main():
    # region setup
    # For insecure local development:
    stub, channel = ClientBuilder(KESSEL_ENDPOINT).insecure().build()
    # endregion

    with channel:
        try:
            # region create
            # Add a workspace relationship to a document that has not been
            # reported yet: the resource is created with the provided
            # relationship values.
            create_common = struct_pb2.Struct()
            create_common.update({"workspace_id": "workspace-2"})

            create_request = add_resource_relationships_request_pb2.AddResourceRelationshipsRequest(
                type="document",
                reporter_type="drive",
                reporter_instance_id="drive-1",
                local_resource_id="doc-456",
                common=create_common,
            )
            stub.AddResourceRelationships(create_request)
            # endregion

            # region remove
            # First step of changing a single-valued relationship: remove the
            # existing value. Removing a value that is not present is an
            # idempotent no-op. Requires doc-123 to be reported with
            # workspace-1 first; see the getting-started report example.
            remove_common = struct_pb2.Struct()
            remove_common.update({"workspace_id": "workspace-1"})

            remove_request = remove_resource_relationships_request_pb2.RemoveResourceRelationshipsRequest(
                type="document",
                reporter_type="drive",
                reporter_instance_id="drive-1",
                local_resource_id="doc-123",
                common=remove_common,
            )
            stub.RemoveResourceRelationships(remove_request)
            # endregion

            # region add
            # Second step of changing a single-valued relationship: add the
            # replacement value. Adding a second value without removing the
            # existing one first is rejected with INVALID_ARGUMENT.
            add_common = struct_pb2.Struct()
            add_common.update({"workspace_id": "workspace-2"})

            add_request = add_resource_relationships_request_pb2.AddResourceRelationshipsRequest(
                type="document",
                reporter_type="drive",
                reporter_instance_id="drive-1",
                local_resource_id="doc-123",
                common=add_common,
            )
            stub.AddResourceRelationships(add_request)
            # endregion

            # region check
            # NOTE: You may need to wait for replication and caches to update.
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

            check_response = stub.Check(check_request)
            print("Check response received successfully")
            print(check_response)
        except grpc.RpcError as e:
            print("gRPC error occurred:")
            print(f"Code: {e.code()}")
            print(f"Details: {e.details()}")
            # endregion


if __name__ == "__main__":
    main()
