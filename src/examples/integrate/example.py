import logging
import os

import grpc
from google.protobuf import struct_pb2
from kessel.inventory.v1beta2 import (
    ClientBuilder,
    check_request_pb2,
    report_resource_request_pb2,
    reporter_reference_pb2,
    representation_metadata_pb2,
    resource_reference_pb2,
    resource_representations_pb2,
    subject_reference_pb2,
)
from kessel.inventory.v1beta2 import allowed_pb2

logger = logging.getLogger(__name__)

# region client-setup
def create_kessel_client():
    stub, channel = (
        ClientBuilder(os.getenv("KESSEL_ENDPOINT"))
        .insecure()
        .build()
    )
    return stub, channel
# endregion


# region report-on-create
class TaskServicer:
    """gRPC servicer for the Task service."""

    def __init__(self, kessel_stub, db, instance_id="taskmanager-1"):
        self.kessel_stub = kessel_stub
        self.db = db
        self.instance_id = instance_id

    def CreateTask(self, request, context):
        # --- Your existing service logic ---
        task = self.db.insert_task(request)

        # --- Report to Kessel ---
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
                            api_href=f"{os.getenv('BASE_URL')}/api/tasks/{task.id}",
                        ),
                        common=common,
                        reporter=reporter_data,
                    ),
                )
            )
        except grpc.RpcError as e:
            # Log but don't fail. The resource exists in your database;
            # Kessel will catch up on the next report or reconciliation.
            logger.warning("kessel: failed to report task %s: %s - %s", task.id, e.code(), e.details())

        return task
# endregion


# region check-middleware
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

        if response.allowed != allowed_pb2.ALLOWED_TRUE:
            return grpc.unary_unary_rpc_method_handler(
                lambda req, ctx: ctx.abort(grpc.StatusCode.PERMISSION_DENIED, "forbidden")
            )

        return handler

# Wire it up when creating the gRPC server:
#
#   view_interceptor = KesselAuthInterceptor(kessel_stub, "task", "TASKMANAGER", "view")
#   edit_interceptor = KesselAuthInterceptor(kessel_stub, "task", "TASKMANAGER", "edit")
#
#   server = grpc.server(
#       futures.ThreadPoolExecutor(max_workers=10),
#       interceptors=[view_interceptor],
#   )
# endregion
