#!/usr/bin/env ruby
# frozen_string_literal: true
# example.rb - Runnable Ruby SDK example

require 'dotenv/load'
require 'json'
require 'kessel-sdk'

include Kessel::Inventory::V1beta2
include Kessel::GRPC
include Kessel::Auth

# region setup
# For insecure local development:
client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', 'localhost:9081'))
                                              .insecure
                                              .build
# endregion

# region add
# Add the workspace relationship without re-reporting the document's full
# representation. Only the named relationship values change.
add_common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => 'workspace-2' }.to_json)
client.add_resource_relationships(
  AddResourceRelationshipsRequest.new(
    type: 'document',
    reporter_type: 'drive',
    reporter_instance_id: 'drive-1',
    local_resource_id: 'doc-123',
    common: add_common
  )
)
# endregion

# region remove
# Remove the previous workspace relationship. Removing a value that is not
# present is an idempotent no-op.
remove_common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => 'workspace-1' }.to_json)
client.remove_resource_relationships(
  RemoveResourceRelationshipsRequest.new(
    type: 'document',
    reporter_type: 'drive',
    reporter_instance_id: 'drive-1',
    local_resource_id: 'doc-123',
    common: remove_common
  )
)
# endregion

# region check
# NOTE: You may need to wait for replication and caches to update.
subject_reference = SubjectReference.new(
  resource: ResourceReference.new(
    reporter: ReporterReference.new(type: 'rbac'),
    resource_id: 'sarah',
    resource_type: 'principal'
  )
)
resource = ResourceReference.new(
  reporter: ReporterReference.new(type: 'drive'),
  resource_id: 'doc-123',
  resource_type: 'document'
)

begin
  response = client.check(
    CheckRequest.new(
      object: resource,
      relation: 'view',
      subject: subject_reference
    )
  )
  p 'check response received successfully:'
  p response
rescue => e
  p 'gRPC error occurred during check:'
  p "Exception: #{e}"
end
# endregion
