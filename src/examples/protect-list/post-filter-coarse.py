from kessel.inventory.v1beta2 import ClientBuilder, check_bulk_request_pb2, allowed_pb2
from kessel.rbac.v2 import workspace_resource, principal_subject

# region setup
# Initialize Kessel client (see "Protect an endpoint" guide for full setup)
stub, channel = ClientBuilder("localhost:9000").insecure().build()
# endregion

# region filter-by-workspace
def filter_by_workspace_permission(integrations, user_id: str, permission: str):
    """Filter integrations by checking workspace permissions.

    Post-filtering (coarse): Check workspace-level permissions for unique workspaces.
    """
    # Step 1: Get unique workspace IDs
    workspace_ids = list(set(i.workspace_id for i in integrations))

    # Step 2: Check workspace permissions with CheckBulk
    items = [
        check_bulk_request_pb2.CheckBulkRequestItem(
            object=workspace_resource(ws_id),
            relation=permission,
            subject=principal_subject(id=user_id, domain="redhat")
        )
        for ws_id in workspace_ids
    ]
    request = check_bulk_request_pb2.CheckBulkRequest(items=items)
    response = stub.CheckBulk(request)

    # Step 3: Build set of allowed workspaces
    allowed_workspaces = set()
    for index, pair in enumerate(response.pairs):
        if pair.item.allowed == allowed_pb2.ALLOWED_TRUE:
            allowed_workspaces.add(workspace_ids[index])

    # Step 4: Filter resources by allowed workspaces
    return [i for i in integrations if i.workspace_id in allowed_workspaces]
# endregion

# region full-example
from sqlalchemy import select
from sqlalchemy.orm import Session

def list_integrations(session: Session, stub, user_id: str):
    """List integrations the user can access.

    Post-filtering (coarse): Query all integrations, then check workspace permissions.
    """
    # Step 1: Query database
    query = select(Integration).filter_by(status="active")
    result = session.execute(query)
    all_integrations = result.scalars().all()

    # Step 2: Filter by workspace permission
    accessible = filter_by_workspace_permission(
        all_integrations,
        user_id,
        "myservice_integration_view"
    )

    return accessible
# endregion
