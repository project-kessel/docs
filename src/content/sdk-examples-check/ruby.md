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
client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', 'nil'))
                                              .insecure
                                              .build

subject_reference = SubjectReference.new(
  resource: ResourceReference.new(
    reporter: ReporterReference.new(
      type: 'rbac'
    ),
    resource_id: 'bob',
    resource_type: 'principal'
  )
)

resource = ResourceReference.new(
  reporter: ReporterReference.new(
    type: 'rbac'
  ),
  resource_id: 'bob_club',
  resource_type: 'group'
)

begin
  response = client.check(
    CheckRequest.new(
      object: resource,
      relation: 'member',
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
