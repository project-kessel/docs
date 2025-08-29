---
language: "Ruby"
order: 50
---

```ruby
#!/usr/bin/env ruby
# frozen_string_literal: true

require 'dotenv/load'
require 'json'
require 'kessel-sdk'

include Kessel::Inventory::V1beta2
include Kessel::GRPC
include Kessel::Auth

# For authenticated environments, uncomment and configure the following:
# discovery = fetch_oidc_discovery(ENV.fetch('AUTH_DISCOVERY_ISSUER_URL', nil))
# oauth = OAuth2ClientCredentials.new(
#   client_id: ENV.fetch('AUTH_CLIENT_ID', nil),
#   client_secret: ENV.fetch('AUTH_CLIENT_SECRET', nil),
#   token_endpoint: discovery.token_endpoint,
# )

# # Set GRPC_DEFAULT_SSL_ROOTS_FILE_PATH if testing locally
# # e.g. GRPC_DEFAULT_SSL_ROOTS_FILE_PATH="$(mkcert -CAROOT)/rootCA.pem"

# # Using the client builder
# client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', nil))
#                                               .oauth2_client_authenticated(oauth2_client_credentials: oauth)
#                                               .build

# For insecure local development:
client = KesselInventoryService::ClientBuilder.new(KESSEL_ENDPOINT)
                                              .insecure
                                              .build

common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => 'workspace-1', 'folder_id' => 'folder-1' }.to_json)

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

begin
  response = client.report_resource(
    ReportResourceRequest.new(
      type: 'document',
      reporter_type: 'drive',
      reporter_instance_id: 'drive-1',
      representations: representations
    )
  )
  puts 'report_resource response received successfully:'
  p response
rescue => e
  puts 'gRPC error occurred during report_resource:'
  puts "Exception: #{e}"
end
```
