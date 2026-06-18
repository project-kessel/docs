from kessel.rbac.v2 import list_workspaces, principal_subject

# region setup
# Initialize Kessel client (see "Protect an endpoint" guide for full setup)
from kessel.inventory.v1beta2 import ClientBuilder

stub, channel = ClientBuilder("localhost:9000").insecure().build()
# endregion

# region get-workspaces
def get_accessible_workspaces(stub, user_id: str, permission: str):
    """Get all workspaces the user can access with the given permission.

    This uses the list_workspaces helper from kessel.rbac.v2 which
    handles StreamedListObjects pagination automatically.
    """
    subject = principal_subject(id=user_id, domain="redhat")

    workspace_ids = []
    for response in list_workspaces(stub, subject, permission):
        workspace_ids.append(response.object.resource_id)

    return workspace_ids
# endregion

# region filter-query
from sqlalchemy import select
from sqlalchemy.orm import Session

def list_integrations(session: Session, stub, user_id: str):
    """List integrations the user can access.

    Pre-filtering: Get allowed workspaces first, then query only those.
    """
    # Step 1: Get workspaces the user can access
    allowed_workspaces = get_accessible_workspaces(
        stub, user_id, "myservice_integration_view"
    )

    if not allowed_workspaces:
        return []

    # Step 2: Query database with workspace filter
    query = select(Integration).where(
        Integration.workspace_id.in_(allowed_workspaces)
    )

    result = session.execute(query)
    return result.scalars().all()
# endregion
