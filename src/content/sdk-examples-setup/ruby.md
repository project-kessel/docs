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


