require 'kessel-sdk'

include Kessel::RBAC::V2
include Kessel::Inventory::V1beta2

# region setup
# Initialize Kessel client (see "Protect an endpoint" guide for full setup)
client = KesselInventoryService::ClientBuilder.new("localhost:9000")
                                              .insecure
                                              .build
# endregion

# region get-workspaces
# Get all workspaces the user can access with the given permission.
#
# This uses the list_workspaces helper from Kessel::RBAC::V2 which
# handles StreamedListObjects pagination automatically.
def get_accessible_workspaces(client, user_id, permission)
  subject = principal_subject(user_id, "redhat")

  workspace_ids = []
  list_workspaces(client, subject, permission).each do |response|
    workspace_ids << response.object.resource_id
  end

  workspace_ids
end
# endregion

# region filter-query
# List integrations the user can access.
#
# Pre-filtering: Get allowed workspaces first, then query only those.
def list_integrations(db, client, user_id)
  # Step 1: Get workspaces the user can access
  allowed_workspaces = get_accessible_workspaces(client, user_id, "myservice_integration_view")

  return [] if allowed_workspaces.empty?

  # Step 2: Query database with workspace filter
  db.exec_params(
    "SELECT * FROM integrations WHERE workspace_id = ANY($1)",
    [allowed_workspaces]
  ).to_a
end
# endregion
