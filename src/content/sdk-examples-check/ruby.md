---
language: "Ruby"
order: 50
---

## Basic Client Setup

Create a basic Kessel client for local development:

```ruby
require 'kessel-sdk'
include Kessel::Inventory::V1beta2
include Kessel::GRPC

# For insecure local development:
client = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', 'localhost:9000'))
                                              .insecure
                                              .build
```

## Auth Client Setup

Set up an authenticated client for production environments:

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
