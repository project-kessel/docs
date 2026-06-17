require 'kessel-sdk'

include Kessel::RBAC::V2
include Kessel::Inventory::V1beta2

# region setup
# Initialize Kessel client (see "Protect an endpoint" guide for full setup)
client = KesselInventoryService::ClientBuilder.new("localhost:9000")
                                              .insecure
                                              .build
# endregion

# region get-resource-ids
# Get all resource IDs the user can access with the given permission.
#
# This uses StreamedListObjects with your specific resource type to find
# exactly which resource IDs the user can access.
def get_accessible_resource_ids(client, user_id, permission)
  subject = principal_subject(user_id, "redhat")
  resource_type = RepresentationType.new(
    resource_type: "integration",
    reporter_type: "myservice"
  )

  request = StreamedListObjectsRequest.new(
    object_type: resource_type,
    relation: permission,
    subject: subject
  )

  # Get accessible resource IDs
  resource_ids = []
  client.streamed_list_objects(request).each do |response|
    resource_ids << response.object.resource_id
  end

  resource_ids
end
# endregion

# region filter-query
# List integrations the user can access.
#
# Pre-filtering (fine-grained): Get allowed resource IDs first, then query only those.
def list_integrations(db, client, user_id)
  # Step 1: Get resource IDs the user can access
  allowed_ids = get_accessible_resource_ids(client, user_id, "view")

  return [] if allowed_ids.empty?

  # Step 2: Query database with resource ID filter
  db.exec_params(
    "SELECT * FROM integrations WHERE id = ANY($1)",
    [allowed_ids]
  ).to_a
end
# endregion
