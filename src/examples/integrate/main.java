package com.example.taskmanager;

import com.google.protobuf.Struct;
import com.google.protobuf.Value;
import com.nimbusds.jose.util.Pair;
import io.grpc.*;
import org.project_kessel.api.inventory.v1beta2.*;

import java.io.IOException;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;

// ---------------------------------------------------------------------------
// Kessel client
// ---------------------------------------------------------------------------

class KesselClientFactory {
    static Pair<KesselInventoryServiceBlockingStub, ManagedChannel> createKesselClient() {
        return new ClientBuilder(System.getenv("KESSEL_ENDPOINT"))
                .insecure()
                .build();
    }
}

// ---------------------------------------------------------------------------
// Task service
// ---------------------------------------------------------------------------

class TaskService {
    private static final Logger logger = Logger.getLogger(TaskService.class.getName());
    private final KesselInventoryServiceBlockingStub kesselClient;
    private final TaskRepository db;
    private final String instanceId;
    private final String baseUrl;

    TaskService(KesselInventoryServiceBlockingStub kesselClient, TaskRepository db) {
        this.kesselClient = kesselClient;
        this.db = db;
        this.instanceId = System.getenv().getOrDefault("REPORTER_INSTANCE_ID", "taskmanager-1");
        this.baseUrl = System.getenv().getOrDefault("BASE_URL", "http://localhost:8080");
    }

    Task createTask(Task task) {
        Task saved = db.insertTask(task);

        ReportResourceRequest request = ReportResourceRequest.newBuilder()
                .setType("task")
                .setReporterType("TASKMANAGER")
                .setReporterInstanceId(instanceId)
                .setRepresentations(ResourceRepresentations.newBuilder()
                        .setMetadata(RepresentationMetadata.newBuilder()
                                .setLocalResourceId(saved.getId())
                                .setApiHref(baseUrl + "/api/tasks/" + saved.getId())
                                .build())
                        .setCommon(Struct.newBuilder()
                                .putAllFields(Map.of(
                                        "workspace_id", Value.newBuilder()
                                                .setStringValue(saved.getWorkspaceId()).build()))
                                .build())
                        .setReporter(Struct.newBuilder()
                                .putAllFields(Map.of(
                                        "title", Value.newBuilder()
                                                .setStringValue(saved.getTitle()).build(),
                                        "status", Value.newBuilder()
                                                .setStringValue(saved.getStatus()).build()))
                                .build())
                        .build())
                .build();

        try {
            kesselClient.reportResource(request);
        } catch (StatusRuntimeException e) {
            logger.log(Level.WARNING, "kessel: failed to report task " + saved.getId(), e);
        }

        return saved;
    }

    void deleteTask(String taskId) {
        db.deleteTask(taskId);

        DeleteResourceRequest request = DeleteResourceRequest.newBuilder()
                .setReference(ResourceReference.newBuilder()
                        .setResourceType("task")
                        .setResourceId(taskId)
                        .setReporter(ReporterReference.newBuilder().setType("TASKMANAGER").build())
                        .build())
                .build();

        try {
            kesselClient.deleteResource(request);
        } catch (StatusRuntimeException e) {
            logger.log(Level.WARNING, "kessel: failed to delete task " + taskId, e);
        }
    }
}

// ---------------------------------------------------------------------------
// Kessel auth interceptor
// ---------------------------------------------------------------------------

class KesselAuthInterceptor implements ServerInterceptor {
    private final KesselInventoryServiceBlockingStub kesselClient;
    private final String resourceType;
    private final String reporterType;
    private final String relation;

    KesselAuthInterceptor(
            KesselInventoryServiceBlockingStub kesselClient,
            String resourceType, String reporterType, String relation) {
        this.kesselClient = kesselClient;
        this.resourceType = resourceType;
        this.reporterType = reporterType;
        this.relation = relation;
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call, Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {

        String userId = headers.get(Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER));
        String resourceId = headers.get(Metadata.Key.of("x-resource-id", Metadata.ASCII_STRING_MARSHALLER));

        if (userId == null) {
            call.close(Status.PERMISSION_DENIED.withDescription("missing user identity"), new Metadata());
            return new ServerCall.Listener<>() {};
        }

        CheckRequest checkRequest = CheckRequest.newBuilder()
                .setObject(ResourceReference.newBuilder()
                        .setResourceType(resourceType)
                        .setResourceId(resourceId)
                        .setReporter(ReporterReference.newBuilder().setType(reporterType).build())
                        .build())
                .setRelation(relation)
                .setSubject(SubjectReference.newBuilder()
                        .setResource(ResourceReference.newBuilder()
                                .setResourceType("principal")
                                .setResourceId(userId)
                                .setReporter(ReporterReference.newBuilder().setType("rbac").build())
                                .build())
                        .build())
                .build();

        try {
            CheckResponse response = kesselClient.check(checkRequest);
            if (response.getAllowed() != Allowed.ALLOWED_TRUE) {
                call.close(Status.PERMISSION_DENIED.withDescription("forbidden"), new Metadata());
                return new ServerCall.Listener<>() {};
            }
        } catch (StatusRuntimeException e) {
            if (e.getStatus().getCode() == Status.Code.UNAVAILABLE) {
                call.close(Status.UNAVAILABLE.withDescription("authorization service unavailable"), new Metadata());
            } else {
                call.close(Status.PERMISSION_DENIED.withDescription("forbidden"), new Metadata());
            }
            return new ServerCall.Listener<>() {};
        }

        return next.startCall(call, headers);
    }
}

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

public class Main {
    private static final Logger logger = Logger.getLogger(Main.class.getName());

    public static void main(String[] args) throws IOException, InterruptedException {
        Pair<KesselInventoryServiceBlockingStub, ManagedChannel> clientAndChannel =
                KesselClientFactory.createKesselClient();
        KesselInventoryServiceBlockingStub kesselClient = clientAndChannel.getLeft();
        ManagedChannel channel = clientAndChannel.getRight();

        ServerInterceptor viewAuth = new KesselAuthInterceptor(kesselClient, "task", "TASKMANAGER", "view");
        ServerInterceptor editAuth = new KesselAuthInterceptor(kesselClient, "task", "TASKMANAGER", "edit");

        TaskService taskService = new TaskService(kesselClient, new InMemoryTaskRepository());

        // Register your service with the gRPC server.
        // In a real project this would use the generated service definition:
        //   .addService(ServerInterceptors.intercept(taskServiceImpl, viewAuth))

        Server server = ServerBuilder.forPort(8080)
                .build();

        server.start();
        logger.info("serving on :8080");

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            server.shutdown();
            channel.shutdown();
        }));

        server.awaitTermination();
    }
}

// ---------------------------------------------------------------------------
// Stubs (stand in for your protobuf-generated types and database layer)
// ---------------------------------------------------------------------------

interface TaskRepository {
    Task insertTask(Task task);
    void deleteTask(String id);
}

class Task {
    private String id, workspaceId, title, status;
    public String getId() { return id; }
    public String getWorkspaceId() { return workspaceId; }
    public String getTitle() { return title; }
    public String getStatus() { return status; }
}

class InMemoryTaskRepository implements TaskRepository {
    public Task insertTask(Task task) { return task; }
    public void deleteTask(String id) {}
}
