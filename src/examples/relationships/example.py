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
        # region add
        # Add the workspace relationship without re-reporting the document's
        # full representation. Only the named relationship values change.
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

        # region remove
        # Remove the previous workspace relationship. Removing a value that
        # is not present is an idempotent no-op.
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

        try:
            check_response = stub.Check(check_request)
            print("Check response received successfully")
            print(check_response)
        except grpc.RpcError as e:
            print("gRPC error occurred during Check:")
            print(f"Code: {e.code()}")
            print(f"Details: {e.details()}")
        # endregion


if __name__ == "__main__":
    main()
