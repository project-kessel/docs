from flask import Flask, request, abort
from functools import wraps
from kessel.inventory.v1beta2 import (
    ClientBuilder,
    check_request_pb2,
    allowed_pb2,
)
from kessel.rbac.v2 import principal_subject, workspace_resource
from connectrpc.errors import ConnectError

app = Flask(__name__)

# region setup
# Initialize Kessel client
stub, channel = ClientBuilder("localhost:9000").insecure().build()
# endregion

# region middleware
def require_permission(relation: str):
    """Decorator to require permission check before executing endpoint."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Extract user from request headers
            user_id = request.headers.get("X-User-ID")
            user_domain = request.headers.get("X-User-Domain", "redhat")

            # Extract workspace from header
            workspace_id = request.headers.get("X-Workspace-ID")

            if not user_id or not workspace_id:
                abort(400, "Missing required headers")

            try:
                # Build check request
                check_req = check_request_pb2.CheckRequest(
                    subject=principal_subject(user_id, user_domain),
                    relation=relation,
                    object=workspace_resource(workspace_id),
                )

                # Perform permission check
                response = stub.Check(check_req)

                if response.allowed != allowed_pb2.ALLOWED_TRUE:
                    abort(403, f"Permission denied for relation '{relation}'")

                # Permission granted, proceed
                return f(*args, **kwargs)

            except ConnectError as e:
                abort(500, f"Permission check failed: {e.message}")

        return decorated_function
    return decorator
# endregion

# region usage
@app.route("/integrations/<integration_id>", methods=["GET"])
@require_permission(relation="myservice_integration_view")
def get_integration(integration_id):
    return {"integration_id": integration_id, "name": "Example Integration"}

@app.route("/integrations/<integration_id>", methods=["PUT"])
@require_permission(relation="myservice_integration_edit")
def update_integration(integration_id):
    return {"status": "updated"}

with channel:
    app.run(debug=True)
# endregion
