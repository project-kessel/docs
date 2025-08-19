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

client = KesselInventoryService::Stub.new(ENV.fetch('KESSEL_ENDPOINT', nil), :this_channel_is_insecure)

common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => '6eb10953-4ec9-4feb-838f-ba43a60880bf' }.to_json)

reporter = Google::Protobuf::Struct.decode_json({
  'satellite_id' => 'ca234d8f-9861-4659-a033-e80460b2801c',
  'sub_manager_id' => 'e9b7d65f-3f81-4c26-b86c-2db663376eed',
  'insights_inventory_id' => 'c4b9b5e7-a82a-467a-b382-024a2f18c129',
  'ansible_host' => 'host-1'
}.to_json)

metadata = RepresentationMetadata.new(
  local_resource_id: '854589f0-3be7-4cad-8bcd-45e18f33cb81',
  api_href: 'https://apiHref.com/',
  console_href: 'https://www.consoleHref.com/',
  reporter_version: '0.2.11'
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
      reporter_instance_id: '0a2a430e-1ad9-4304-8e75-cc6fd3b5441a',
      representations: representations
    )
  )
  p 'report_resource response received successfully:'
  p response
rescue Exception => e
  p 'gRPC error occurred during report_resource:'
  p "Exception #{e}"
end
```
