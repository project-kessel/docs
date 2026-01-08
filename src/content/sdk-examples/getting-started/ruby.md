---
language: "Ruby"
order: 50
---
### Import client

```bash
gem install kessel-sdk
```

#### Basic Client Setup

```ruby
require 'kessel-sdk'
include Kessel::Inventory::V1beta2
include Kessel::GRPC

# For insecure local development:
client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', 'localhost:9000'))
                                                .insecure
                                                .build
```

#### Auth Client Setup

```ruby
require 'kessel-sdk'
include Kessel::Inventory::V1beta2
include Kessel::GRPC
include Kessel::Auth

# Fetch OIDC discovery information
discovery = fetch_oidc_discovery(ENV.fetch('AUTH_DISCOVERY_ISSUER_URL'))

# Create OAuth2 credentials
oauth = OAuth2ClientCredentials.new(
    client_id: ENV.fetch('AUTH_CLIENT_ID'),
    client_secret: ENV.fetch('AUTH_CLIENT_SECRET'),
    token_endpoint: discovery.token_endpoint,
)

# Build authenticated client
client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT'))
                                                .oauth2_client_authenticated(oauth2_client_credentials: oauth)
                                                .build
```

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

## Creating Check Requests

Build a permission check request:

```ruby
# Prepare the subject reference object (who is requesting access)
subject_reference = SubjectReference.new(
  resource: ResourceReference.new(
    reporter: ReporterReference.new(type: 'rbac'),
    resource_id: 'sarah',
    resource_type: 'principal'
  )
)

# Prepare the resource reference object (what is being accessed)
resource = ResourceReference.new(
  reporter: ReporterReference.new(type: 'drive'),
  resource_id: 'doc-123',
  resource_type: 'document'
)

# Build the complete check request
check_request = CheckRequest.new(
  object: resource,
  relation: 'view',
  subject: subject_reference
)
```

## Sending Check Requests

Execute the check request and handle the response:

```ruby
begin
  response = client.check(check_request)
  p 'check response received successfully:'
  p response
rescue => e
  p 'gRPC error occurred during check:'
  p "Exception: #{e}"
end
```

## Complete Example

```ruby
#!/usr/bin/env ruby
# frozen_string_literal: true

require 'dotenv/load'
require 'json'
require 'kessel-sdk'

include Kessel::Inventory::V1beta2
include Kessel::GRPC
include Kessel::Auth

# For insecure local development:
client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', 'localhost:9000'))
                                              .insecure
                                              .build

# 1) Report a resource first
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

# 2) Then perform a permission check
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
```
