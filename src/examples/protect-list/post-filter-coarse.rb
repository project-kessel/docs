require 'kessel-sdk'

include Kessel::RBAC::V2
include Kessel::Inventory::V1beta2

# region setup
# Initialize Kessel client (see "Protect an endpoint" guide for full setup)
client = KesselInventoryService::ClientBuilder.new("localhost:9000")
                                              .insecure
                                              .build
# endregion

# region filter-by-workspace
# Filter integrations by checking workspace permissions.
#
# Post-filtering (coarse): Check workspace-level permissions for unique workspaces.
def filter_by_workspace_permission(integrations, client, user_id, permission)
  # Step 1: Get unique workspace IDs
  workspace_ids = integrations.map { |i| i[:workspace_id] }.uniq

  # Step 2: Check workspace permissions with CheckBulk
  items = workspace_ids.map do |ws_id|
    CheckBulkRequestItem.new(
      object: workspace_resource(ws_id),
      relation: permission,
      subject: principal_subject(user_id, "redhat")
    )
  end

  request = CheckBulkRequest.new(items: items)
  response = client.check_bulk(request)

  # Step 3: Build set of allowed workspaces
  allowed_workspaces = Set.new
  response.pairs.each_with_index do |pair, index|
    if pair.item&.allowed == Allowed::ALLOWED_TRUE
      allowed_workspaces << workspace_ids[index]
    end
  end

  # Step 4: Filter resources by allowed workspaces
  integrations.select { |i| allowed_workspaces.include?(i[:workspace_id]) }
end
# endregion

# region full-example
# List integrations the user can access.
#
# Post-filtering (coarse): Query all integrations, then check workspace permissions.
def list_integrations(db, client, user_id)
  # Step 1: Query database
  all_integrations = db.exec("SELECT * FROM integrations WHERE status = 'active'").to_a

  # Step 2: Filter by workspace permission
  filter_by_workspace_permission(
    all_integrations,
    client,
    user_id,
    "myservice_integration_view"
  )
end
# endregion
