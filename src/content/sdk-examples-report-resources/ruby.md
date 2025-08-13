---
language: "Ruby"
order: 50
---

```ruby
#!/usr/bin/env ruby
# frozen_string_literal: true

require 'dotenv/load'
require 'kessel-sdk'

include Kessel::Inventory::V1beta2

client = KesselInventoryService::Stub.new(ENV.fetch('KESSEL_ENDPOINT', nil), :this_channel_is_insecure)

subject_reference = SubjectReference.new(
  resource: ResourceReference.new(
    reporter: ReporterReference.new(
      type: 'rbac'
    ),
    resource_id: 'foobar',
    resource_type: 'principal'
  )
)

resource = ResourceReference.new(
  reporter: ReporterReference.new(
    type: 'rbac'
  ),
  resource_id: '1234',
  resource_type: 'workspace'
)

begin
  response = client.check(
    CheckRequest.new(
      object: resource,
      relation: 'inventory_host_view',
      subject: subject_reference
    )
  )
  p 'check response received successfully:'
  p response
rescue Exception => e
  p 'gRPC error occurred during check:'
  p "Exception #{e}"
end
```
