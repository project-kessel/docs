#!/usr/bin/env ruby
# frozen_string_literal: true

require 'kessel-sdk'

include Kessel::Auth
include Kessel::RBAC::V2

# region discover
# Option 1: Use OIDC discovery to find the token endpoint automatically
discovery = fetch_oidc_discovery(ENV.fetch('ISSUER_URL'))
credentials = OAuth2ClientCredentials.new(
  client_id: ENV.fetch('CLIENT_ID'),
  client_secret: ENV.fetch('CLIENT_SECRET'),
  token_endpoint: discovery.token_endpoint,
)
# endregion

# region direct-token
# Option 2: Provide the token endpoint URL directly
credentials = OAuth2ClientCredentials.new(
  client_id: ENV.fetch('CLIENT_ID'),
  client_secret: ENV.fetch('CLIENT_SECRET'),
  token_endpoint: ENV.fetch('TOKEN_ENDPOINT'),
)
# endregion

# region build-client
client = Kessel::Inventory::V1beta2::KesselInventoryService::ClientBuilder
           .new(ENV.fetch('KESSEL_ENDPOINT'))
           .oauth2_client_authenticated(oauth2_client_credentials: credentials)
           .build
# endregion

# region rbac-auth
# Wrap credentials as an HTTP auth adapter for RBAC REST calls
auth = oauth2_auth_request(credentials)

root_workspace = fetch_root_workspace(
  ENV.fetch('RBAC_ENDPOINT'),
  ENV.fetch('ORG_ID'),
  auth: auth,
)
puts "Root workspace: #{root_workspace.name} (ID: #{root_workspace.id})"
# endregion
