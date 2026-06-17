require 'kessel-sdk'

include Kessel::RBAC::V2
include Kessel::Inventory::V1beta2

# region setup
# Initialize Kessel client (see "Protect an endpoint" guide for full setup)
client = KesselInventoryService::ClientBuilder.new("localhost:9000")
                                              .insecure
                                              .build
# endregion

# region bulk-check
# Filter integrations using CheckBulk to batch permission checks.
#
# This is more efficient than calling Check() in a loop.
def filter_integrations_by_permission(integrations, client, user_id, permission)
  # Build bulk check request with one item per integration
  items = integrations.map do |integration|
    CheckBulkRequestItem.new(
      object: workspace_resource(integration[:workspace_id]),
      relation: permission,
      subject: principal_subject(user_id, "redhat")
    )
  end

  request = CheckBulkRequest.new(items: items)

  # Make single API call to check all permissions
  response = client.check_bulk(request)

  # Filter integrations based on bulk check results
  accessible_integrations = []
  response.pairs.each_with_index do |pair, index|
    if pair.item&.allowed == Allowed::ALLOWED_TRUE
      accessible_integrations << integrations[index]
    end
  end

  accessible_integrations
end
# endregion

# region full-example
# List integrations the user can access.
#
# Post-filtering with CheckBulk: Query all integrations, then batch-check permissions.
def list_integrations(db, client, user_id)
  # Step 1: Query all integrations from database
  all_integrations = db.exec("SELECT * FROM integrations").to_a

  # Step 2: Use CheckBulk to filter by permission
  filter_integrations_by_permission(
    all_integrations,
    client,
    user_id,
    "myservice_integration_view"
  )
end
# endregion
