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

# region create
# Add a workspace relationship to a document that has not been reported
# yet: the resource is created with the provided relationship values.
create_common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => 'workspace-2' }.to_json)
client.add_resource_relationships(
  AddResourceRelationshipsRequest.new(
    type: 'document',
    reporter_type: 'drive',
    reporter_instance_id: 'drive-1',
    local_resource_id: 'doc-456',
    common: create_common
  )
)
# endregion

# region remove
# First step of changing a single-valued relationship: remove the existing
# value. Removing a value that is not present is an idempotent no-op.
# Requires doc-123 to be reported with workspace-1 first; see the
# getting-started report example.
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

# region add
# Second step of changing a single-valued relationship: add the
# replacement value. Adding a second value without removing the existing
# one first is rejected with INVALID_ARGUMENT.
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
  p "Exception: #{e.class}: #{e.message}"
end
# endregion
