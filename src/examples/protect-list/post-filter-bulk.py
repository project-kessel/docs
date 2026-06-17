from kessel.inventory.v1beta2 import check_bulk_request_pb2
from kessel.inventory.v1beta2 import allowed_pb2
from kessel.rbac.v2 import workspace_resource, principal_subject

# region setup
# Initialize Kessel client (see "Protect an endpoint" guide for full setup)
from kessel.inventory.v1beta2 import ClientBuilder

client, channel = ClientBuilder("localhost:9000").insecure().build()
# endregion

# region bulk-check
async def filter_integrations_by_permission(integrations, user_id: str, permission: str):
    """Filter integrations using CheckBulk to batch permission checks.

    This is more efficient than calling Check() in a loop.
    """
    # Build bulk check request with one item per integration
    items = []
    for integration in integrations:
        item = check_bulk_request_pb2.CheckBulkRequestItem(
            object=workspace_resource(integration.workspace_id),
            relation=permission,
            subject=principal_subject(id=user_id, domain="redhat"),
        )
        items.append(item)

    request = check_bulk_request_pb2.CheckBulkRequest(items=items)

    # Make single API call to check all permissions
    response = await client.check_bulk(request)

    # Filter integrations based on bulk check results
    accessible_integrations = []
    for index, pair in enumerate(response.pairs):
        if pair.item.allowed == allowed_pb2.ALLOWED_TRUE:
            accessible_integrations.append(integrations[index])

    return accessible_integrations
# endregion

# region full-example
from sqlalchemy import select
from sqlalchemy.orm import Session

async def list_integrations(session: Session, client, user_id: str):
    """List integrations the user can access.

    Post-filtering with CheckBulk: Query all integrations, then batch-check permissions.
    """
    # Step 1: Query all integrations from database
    query = select(Integration)
    result = session.execute(query)
    all_integrations = result.scalars().all()

    # Step 2: Use CheckBulk to filter by permission
    accessible = await filter_integrations_by_permission(
        all_integrations,
        user_id,
        "myservice_integration_view"
    )

    return accessible
# endregion
