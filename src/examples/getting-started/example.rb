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
client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', 'localhost:9000'))
                                              .insecure
                                              .build
# endregion

# region report
common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => 'workspace-1' }.to_json)
reporter = Google::Protobuf::Struct.decode_json({
  'document_id' => 'doc-123',
  'document_name' => 'My Important Document',
  'document_type' => 'document',
  'created_at' => '2025-08-31T10:30:00Z',
  'file_size' => 2048576,
  'owner_id' => 'user-1'
}.to_json)
metadata = RepresentationMetadata.new(
  local_resource_id: 'doc-123',
  api_href: 'https://drive.example.com/document/123',
  console_href: 'https://www.console.com/drive/documents',
  reporter_version: '2.7.16'
)
representations = ResourceRepresentations.new(
  metadata: metadata,
  common: common,
  reporter: reporter
)
client.report_resource(
  ReportResourceRequest.new(
    type: 'document',
    reporter_type: 'drive',
    reporter_instance_id: 'drive-1',
    representations: representations
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
