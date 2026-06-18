from kessel.inventory.v1beta2 import ClientBuilder, streamed_list_objects_request_pb2, representation_type_pb2
from kessel.rbac.v2 import principal_subject

# region setup
# Initialize Kessel client (see "Protect an endpoint" guide for full setup)
stub, channel = ClientBuilder("localhost:9000").insecure().build()
# endregion

# region get-resource-ids
def get_accessible_resource_ids(stub, user_id: str, permission: str):
    """Get all resource IDs the user can access with the given permission.

    This uses StreamedListObjects with your specific resource type to find
    exactly which resource IDs the user can access.
    """
    subject = principal_subject(id=user_id, domain="redhat")
    resource_type = representation_type_pb2.RepresentationType(
        resource_type="integration",
        reporter_type="myservice"
    )

    request = streamed_list_objects_request_pb2.StreamedListObjectsRequest(
        object_type=resource_type,
        relation=permission,
        subject=subject
    )

    # Get accessible resource IDs
    resource_ids = []
    for response in stub.StreamedListObjects(request):
        resource_ids.append(response.object.resource_id)

    return resource_ids
# endregion

# region filter-query
from sqlalchemy import select
from sqlalchemy.orm import Session

def list_integrations(session: Session, stub, user_id: str):
    """List integrations the user can access.

    Pre-filtering (fine-grained): Get allowed resource IDs first, then query only those.
    """
    # Step 1: Get resource IDs the user can access
    allowed_ids = get_accessible_resource_ids(stub, user_id, "view")

    if not allowed_ids:
        return []

    # Step 2: Query database with resource ID filter
    query = select(Integration).where(Integration.id.in_(allowed_ids))
    result = session.execute(query)
    return result.scalars().all()
# endregion
