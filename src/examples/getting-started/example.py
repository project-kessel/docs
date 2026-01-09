import grpc
from google.protobuf import struct_pb2
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

KESSEL_ENDPOINT = "localhost:9081"


def main():
    # region setup
    # For insecure local development:
    stub, channel = ClientBuilder(KESSEL_ENDPOINT).insecure().build()
    # endregion

    with channel:
        # region report
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
        stub.ReportResource(report_req)
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
