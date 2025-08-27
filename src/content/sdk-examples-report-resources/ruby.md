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

# For authenticated environments, uncomment and configure the following:
# auth_credentials = OAuth2ClientCredentials.new(
#   client_id: CLIENT_ID,
#   client_secret: CLIENT_SECRET,
#   token_endpoint: "#{ISSUER_URL}/token"
# )
# client = KesselInventoryService::ClientBuilder.new(KESSEL_ENDPOINT)
#                                               .oauth2_client_authenticated(auth_credentials)
#                                               .build

# For insecure local development:
client = KesselInventoryService::ClientBuilder.new(KESSEL_ENDPOINT)
                                              .insecure
                                              .build

common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => 'a64d17d0-aec3-410a-acd0-e0b85b22c076' }.to_json)

reporter = Google::Protobuf::Struct.decode_json({
  'satellite_id' => 'ca234d8f-9861-4659-a033-e80460b2801c',
  'sub_manager_id' => 'e9b7d65f-3f81-4c26-b86c-2db663376eed',
  'insights_inventory_id' => '05707922-7b0a-4fe6-982d-6adbc7695b8f',
  'ansible_host' => 'host-1'
}.to_json)

metadata = RepresentationMetadata.new(
  local_resource_id: 'dd1b73b9-3e33-4264-968c-e3ce55b9afec',
  api_href: 'https://apiHref.com/',
  console_href: 'https://www.console.com/',
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
      type: 'host',
      reporter_type: 'hbi',
      reporter_instance_id: '3088be62-1c60-4884-b133-9200542d0b3f',
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
