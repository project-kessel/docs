require 'kessel-sdk'
require 'json'

include Kessel::Inventory::V1beta2

# ---------------------------------------------------------------------------
# Kessel client
# ---------------------------------------------------------------------------

def create_kessel_client
  builder = KesselInventoryService::ClientBuilder.new(ENV.fetch('KESSEL_ENDPOINT', nil))
  builder.insecure.build
end

# ---------------------------------------------------------------------------
# Task service
# ---------------------------------------------------------------------------

class TaskServicer
  def initialize(kessel_client, db, instance_id: nil)
    @kessel_client = kessel_client
    @db = db
    @instance_id = instance_id || ENV.fetch('REPORTER_INSTANCE_ID', 'taskmanager-1')
    @base_url = ENV.fetch('BASE_URL', 'http://localhost:8080')
  end

  def create_task(request, _call)
    task = @db.insert_task(request)

    common = Google::Protobuf::Struct.decode_json({ 'workspace_id' => task.workspace_id }.to_json)
    reporter_data = Google::Protobuf::Struct.decode_json(
      { 'title' => task.title, 'status' => task.status }.to_json
    )

    begin
      @kessel_client.report_resource(
        ReportResourceRequest.new(
          type: 'task',
          reporter_type: 'TASKMANAGER',
          reporter_instance_id: @instance_id,
          representations: ResourceRepresentations.new(
            metadata: RepresentationMetadata.new(
              local_resource_id: task.id,
              api_href: "#{@base_url}/api/tasks/#{task.id}"
            ),
            common: common,
            reporter: reporter_data
          )
        )
      )
    rescue GRPC::BadStatus => e
      warn "kessel: failed to report task #{task.id}: #{e.message}"
    end

    task
  end

  def delete_task(request, _call)
    @db.delete_task(request.id)

    begin
      @kessel_client.delete_resource(
        DeleteResourceRequest.new(
          reference: ResourceReference.new(
            resource_type: 'task',
            resource_id: request.id,
            reporter: ReporterReference.new(type: 'TASKMANAGER')
          )
        )
      )
    rescue GRPC::BadStatus => e
      warn "kessel: failed to delete task #{request.id}: #{e.message}"
    end
  end
end

# ---------------------------------------------------------------------------
# Kessel auth interceptor
# ---------------------------------------------------------------------------

class KesselAuthInterceptor < GRPC::ServerInterceptor
  def initialize(kessel_client, resource_type, reporter_type, relation)
    @kessel_client = kessel_client
    @resource_type = resource_type
    @reporter_type = reporter_type
    @relation = relation
  end

  def request_response(request:, call:, method:)
    user_id = call.metadata['x-user-id']
    resource_id = call.metadata['x-resource-id']

    raise GRPC::PermissionDenied, 'missing user identity' unless user_id

    response = @kessel_client.check(
      CheckRequest.new(
        object: ResourceReference.new(
          resource_type: @resource_type,
          resource_id: resource_id,
          reporter: ReporterReference.new(type: @reporter_type)
        ),
        relation: @relation,
        subject: SubjectReference.new(
          resource: ResourceReference.new(
            resource_type: 'principal',
            resource_id: user_id,
            reporter: ReporterReference.new(type: 'rbac')
          )
        )
      )
    )

    raise GRPC::PermissionDenied, 'forbidden' unless response.allowed == Allowed::ALLOWED_TRUE

    yield
  rescue GRPC::Unavailable
    raise GRPC::Unavailable, 'authorization service unavailable'
  rescue GRPC::BadStatus
    raise GRPC::PermissionDenied, 'forbidden'
  end
end

# ---------------------------------------------------------------------------
# Server startup
# ---------------------------------------------------------------------------

kessel_client = create_kessel_client
db = DB.new

view_interceptor = KesselAuthInterceptor.new(kessel_client, 'task', 'TASKMANAGER', 'view')
edit_interceptor = KesselAuthInterceptor.new(kessel_client, 'task', 'TASKMANAGER', 'edit')

server = GRPC::RpcServer.new(interceptors: [view_interceptor])
server.add_http2_port('0.0.0.0:8080', :this_port_is_insecure)

servicer = TaskServicer.new(kessel_client, db)

# Register your servicer with the gRPC server.
# In a real project this would use the generated service handler:
#   server.handle(servicer)

puts 'serving on :8080'
server.run_till_terminated

# ---------------------------------------------------------------------------
# Stubs (stand in for your protobuf-generated types and database layer)
# ---------------------------------------------------------------------------

Task = Struct.new(:id, :workspace_id, :title, :status, keyword_init: true)

class DB
  def insert_task(request)
    Task.new(id: '', workspace_id: '', title: '', status: 'open')
  end

  def delete_task(task_id) end
end
