require 'sinatra'
require 'kessel/inventory/v1beta2/client_builder'
require 'kessel/inventory/v1beta2/check_request_pb'
require 'kessel/inventory/v1beta2/allowed_pb'
require 'kessel/rbac/v2'

include Kessel::RBAC::V2

# region setup
# Initialize Kessel client
client = Kessel::Inventory::V1beta2::ClientBuilder
  .new("localhost:9000")
  .insecure
  .build
# endregion

# region middleware
# Helper to check permissions
def check_permission(client, relation)
  user_id = request.env['HTTP_X_USER_ID']
  workspace_id = request.env['HTTP_X_WORKSPACE_ID']

  halt 400, { error: 'Missing required headers' }.to_json if user_id.nil? || workspace_id.nil?

  check_request = Kessel::Inventory::V1beta2::CheckRequest.new(
    object: workspace_resource(workspace_id),
    relation: relation,
    subject: principal_subject(user_id, "redhat")
  )

  begin
    response = client.check(check_request)
    unless response.allowed == Kessel::Inventory::V1beta2::Allowed::ALLOWED_TRUE
      halt 403, { error: 'Forbidden' }.to_json
    end
  rescue StandardError => e
    logger.error "Check failed: #{e.message}"
    halt 500, { error: 'Permission check failed' }.to_json
  end
end
# endregion

# region usage
get '/integrations/:id' do
  check_permission(client, "myservice_integration_view")
  { integration_id: params[:id] }.to_json
end

put '/integrations/:id' do
  check_permission(client, "myservice_integration_edit")
  { status: 'updated' }.to_json
end
# endregion
