---
language: "Ruby"
order: 50
---
## Creating Report Resource Requests

Build a ReportResource Request:

```ruby
require 'json'

# Common metadata shared across all reporters
common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => 'workspace-1' }.to_json)

# Reporter-specific data for the drive service
reporter = Google::Protobuf::Struct.decode_json({
  'document_id' => 'doc-123',
  'document_name' => 'My Important Document',
  'document_type' => 'document',
  'created_at' => '2025-08-31T10:30:00Z',
  'file_size' => 2048576,
  'owner_id' => 'user-1'
}.to_json)

# Create metadata for the resource representation
metadata = RepresentationMetadata.new(
  local_resource_id: 'doc-123',
  api_href: 'https://drive.example.com/document/123',
  console_href: 'https://www.console.com/drive/documents',
  reporter_version: '2.7.16'
)

# Build the resource representations
representations = ResourceRepresentations.new(
  metadata: metadata,
  common: common,
  reporter: reporter
)

# Create the complete report resource request
report_request = ReportResourceRequest.new(
  type: 'document',
  reporter_type: 'drive',
  reporter_instance_id: 'drive-1',
  representations: representations
)
```

## Sending Report Resource Requests

Execute the report resource request and handle the response:

```ruby
begin
  response = client.report_resource(report_request)
  puts 'report_resource response received successfully:'
  p response
rescue => e
  puts 'gRPC error occurred during report_resource:'
  puts "Exception: #{e}"
end
```
