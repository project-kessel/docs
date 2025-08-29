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
client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', 'nil'))
                                              .insecure
                                              .build

subject_reference = SubjectReference.new(
  resource: ResourceReference.new(
    reporter: ReporterReference.new(
      type: 'rbac'
    ),
    resource_id: 'sarah',
    resource_type: 'principal'
  )
)

resource = ResourceReference.new(
  reporter: ReporterReference.new(
    type: 'drive'
  ),
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
