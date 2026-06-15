import logging
import os
from concurrent import futures

import grpc
from google.protobuf import struct_pb2
from kessel.auth import OAuth2ClientCredentials, fetch_oidc_discovery
from kessel.inventory.v1beta2 import (
    ClientBuilder,
    check_request_pb2,
    delete_resource_request_pb2,
    report_resource_request_pb2,
    reporter_reference_pb2,
    representation_metadata_pb2,
    resource_reference_pb2,
    resource_representations_pb2,
    subject_reference_pb2,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Kessel client
# ---------------------------------------------------------------------------

def create_kessel_client():
    """Create an authenticated Kessel Inventory client using OAuth2 and TLS."""
    discovery = fetch_oidc_discovery(os.getenv("KESSEL_ISSUER_URL"))

    auth_credentials = OAuth2ClientCredentials(
        client_id=os.getenv("KESSEL_CLIENT_ID"),
        client_secret=os.getenv("KESSEL_CLIENT_SECRET"),
        token_endpoint=discovery.token_endpoint,
    )

    with open(os.getenv("KESSEL_CA_CERT_PATH"), "rb") as f:
        ca_cert = f.read()
    ssl_credentials = grpc.ssl_channel_credentials(root_certificates=ca_cert)

    stub, channel = (
        ClientBuilder(os.getenv("KESSEL_ENDPOINT"))
        .oauth2_client_authenticated(auth_credentials, ssl_credentials)
        .build()
    )
    return stub, channel


# ---------------------------------------------------------------------------
# Task service
# ---------------------------------------------------------------------------

class TaskServicer:
    """gRPC servicer for the Task service."""

    def __init__(self, kessel_stub, db, instance_id=None):
        self.kessel_stub = kessel_stub
        self.db = db
        self.instance_id = instance_id or os.getenv("REPORTER_INSTANCE_ID", "taskmanager-1")
        self.base_url = os.getenv("BASE_URL", "http://localhost:8080")

    def CreateTask(self, request, context):
        task = self.db.insert_task(request)

        common = struct_pb2.Struct()
        common.update({"workspace_id": task.workspace_id})

        reporter_data = struct_pb2.Struct()
        reporter_data.update({"title": task.title, "status": task.status})

        try:
            self.kessel_stub.ReportResource(
                report_resource_request_pb2.ReportResourceRequest(
                    type="task",
                    reporter_type="TASKMANAGER",
                    reporter_instance_id=self.instance_id,
                    representations=resource_representations_pb2.ResourceRepresentations(
                        metadata=representation_metadata_pb2.RepresentationMetadata(
                            local_resource_id=task.id,
                            api_href=f"{self.base_url}/api/tasks/{task.id}",
                        ),
                        common=common,
                        reporter=reporter_data,
                    ),
                )
            )
        except grpc.RpcError as e:
            logger.warning("kessel: failed to report task %s: %s - %s", task.id, e.code(), e.details())

        return task

    def DeleteTask(self, request, context):
        self.db.delete_task(request.id)

        try:
            self.kessel_stub.DeleteResource(
                delete_resource_request_pb2.DeleteResourceRequest(
                    reference=resource_reference_pb2.ResourceReference(
                        resource_type="task",
                        resource_id=request.id,
                        reporter=reporter_reference_pb2.ReporterReference(type="TASKMANAGER"),
                    ),
                )
            )
        except grpc.RpcError as e:
            logger.warning("kessel: failed to delete task %s: %s - %s", request.id, e.code(), e.details())

        return DeleteTaskResponse()


# ---------------------------------------------------------------------------
# Kessel auth interceptor
# ---------------------------------------------------------------------------

class KesselAuthInterceptor(grpc.ServerInterceptor):
    """gRPC server interceptor that checks Kessel permissions before the handler runs."""

    def __init__(self, kessel_stub, resource_type, reporter_type, relation):
        self.kessel_stub = kessel_stub
        self.resource_type = resource_type
        self.reporter_type = reporter_type
        self.relation = relation

    def intercept_service(self, continuation, handler_call_details):
        handler = continuation(handler_call_details)
        if handler is None:
            return None

        metadata = dict(handler_call_details.invocation_metadata)
        user_id = metadata.get("x-user-id")
        resource_id = metadata.get("x-resource-id")

        if not user_id:
            return grpc.unary_unary_rpc_method_handler(
                lambda req, ctx: ctx.abort(grpc.StatusCode.PERMISSION_DENIED, "missing user identity")
            )

        try:
            response = self.kessel_stub.Check(
                check_request_pb2.CheckRequest(
                    object=resource_reference_pb2.ResourceReference(
                        resource_type=self.resource_type,
                        resource_id=resource_id,
                        reporter=reporter_reference_pb2.ReporterReference(type=self.reporter_type),
                    ),
                    relation=self.relation,
                    subject=subject_reference_pb2.SubjectReference(
                        resource=resource_reference_pb2.ResourceReference(
                            resource_type="principal",
                            resource_id=user_id,
                            reporter=reporter_reference_pb2.ReporterReference(type="rbac"),
                        ),
                    ),
                )
            )
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAVAILABLE:
                return grpc.unary_unary_rpc_method_handler(
                    lambda req, ctx: ctx.abort(grpc.StatusCode.UNAVAILABLE, "authorization service unavailable")
                )
            return grpc.unary_unary_rpc_method_handler(
                lambda req, ctx: ctx.abort(grpc.StatusCode.PERMISSION_DENIED, "forbidden")
            )

        if response.allowed != 1:  # ALLOWED_TRUE
            return grpc.unary_unary_rpc_method_handler(
                lambda req, ctx: ctx.abort(grpc.StatusCode.PERMISSION_DENIED, "forbidden")
            )

        return handler


# ---------------------------------------------------------------------------
# Server startup
# ---------------------------------------------------------------------------

def serve():
    kessel_stub, kessel_channel = create_kessel_client()
    db = DB()

    view_interceptor = KesselAuthInterceptor(kessel_stub, "task", "TASKMANAGER", "view")
    edit_interceptor = KesselAuthInterceptor(kessel_stub, "task", "TASKMANAGER", "edit")

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=[view_interceptor],
    )

    servicer = TaskServicer(kessel_stub, db)

    # Register your servicer with the gRPC server.
    # In a real project this would be the generated registration function:
    #   task_pb2_grpc.add_TaskServiceServicer_to_server(servicer, server)

    server.add_insecure_port("[::]:8080")
    logger.info("serving on :8080")
    server.start()
    server.wait_for_termination()
    kessel_channel.close()


# ---------------------------------------------------------------------------
# Stubs (stand in for your protobuf-generated types and database layer)
# ---------------------------------------------------------------------------

class Task:
    def __init__(self, id="", workspace_id="", title="", status="open"):
        self.id = id
        self.workspace_id = workspace_id
        self.title = title
        self.status = status

class DeleteTaskResponse:
    pass

class DB:
    def insert_task(self, request):
        return Task()

    def delete_task(self, task_id):
        pass


if __name__ == "__main__":
    serve()
