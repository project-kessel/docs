import { readFileSync } from "fs";
import {
    Server,
    ServerCredentials,
    Metadata,
    credentials,
    status as grpcStatus,
} from "@grpc/grpc-js";
import type {
    ServerUnaryCall,
    sendUnaryData,
    handleUnaryCall,
    ServerInterceptingCall,
} from "@grpc/grpc-js";
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import { fetchOIDCDiscovery, OAuth2ClientCredentials } from "@project-kessel/kessel-sdk/kessel/auth";
import type { CheckRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_request";
import type { ReportResourceRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/report_resource_request";

// ---------------------------------------------------------------------------
// Kessel client
// ---------------------------------------------------------------------------

async function createKesselClient() {
    const discovery = await fetchOIDCDiscovery(process.env.KESSEL_ISSUER_URL!);

    const auth = new OAuth2ClientCredentials({
        clientId: process.env.KESSEL_CLIENT_ID!,
        clientSecret: process.env.KESSEL_CLIENT_SECRET!,
        tokenEndpoint: discovery.tokenEndpoint,
    });

    const caCert = readFileSync(process.env.KESSEL_CA_CERT_PATH!);
    const tlsCreds = credentials.createSsl(caCert);

    return new ClientBuilder(process.env.KESSEL_ENDPOINT!)
        .oauth2ClientAuthenticated(auth, tlsCreds)
        .buildAsync();
}

const kesselClient = await createKesselClient();

const INSTANCE_ID = process.env.REPORTER_INSTANCE_ID ?? "taskmanager-1";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

// ---------------------------------------------------------------------------
// Task service handlers
// ---------------------------------------------------------------------------

const createTask: handleUnaryCall<CreateTaskRequest, CreateTaskResponse> = async (
    call: ServerUnaryCall<CreateTaskRequest, CreateTaskResponse>,
    callback: sendUnaryData<CreateTaskResponse>
) => {
    const task = await db.insertTask(call.request);

    const reportRequest: ReportResourceRequest = {
        type: "task",
        reporterType: "TASKMANAGER",
        reporterInstanceId: INSTANCE_ID,
        representations: {
            metadata: {
                localResourceId: task.id,
                apiHref: `${BASE_URL}/api/tasks/${task.id}`,
            },
            common: { workspace_id: task.workspaceId },
            reporter: { title: task.title, status: task.status },
        },
    };

    try {
        await kesselClient.reportResource(reportRequest);
    } catch (err) {
        console.warn(`kessel: failed to report task ${task.id}:`, err);
    }

    callback(null, { task });
};

const deleteTask: handleUnaryCall<DeleteTaskRequest, DeleteTaskResponse> = async (
    call: ServerUnaryCall<DeleteTaskRequest, DeleteTaskResponse>,
    callback: sendUnaryData<DeleteTaskResponse>
) => {
    await db.deleteTask(call.request.id);

    try {
        await kesselClient.deleteResource({
            reference: {
                resourceType: "task",
                resourceId: call.request.id,
                reporter: { type: "TASKMANAGER" },
            },
        });
    } catch (err) {
        console.warn(`kessel: failed to delete task ${call.request.id}:`, err);
    }

    callback(null, {});
};

// ---------------------------------------------------------------------------
// Kessel auth interceptor
// ---------------------------------------------------------------------------

function kesselAuthInterceptor(
    client: typeof kesselClient,
    resourceType: string,
    reporterType: string,
    relation: string
) {
    return async function intercept(
        call: ServerInterceptingCall,
        methodDefinition: any,
        next: Function
    ) {
        const metadata: Metadata = call.metadata;
        const userIds = metadata.get("x-user-id");
        const resourceIds = metadata.get("x-resource-id");

        if (!userIds.length) {
            call.sendStatus({
                code: grpcStatus.PERMISSION_DENIED,
                details: "missing user identity",
            });
            return;
        }

        const checkRequest: CheckRequest = {
            object: {
                resourceType,
                resourceId: String(resourceIds[0]),
                reporter: { type: reporterType },
            },
            relation,
            subject: {
                resource: {
                    resourceType: "principal",
                    resourceId: String(userIds[0]),
                    reporter: { type: "rbac" },
                },
            },
        };

        try {
            const response = await client.check(checkRequest);
            if (response.allowed !== 1) { // ALLOWED_TRUE
                call.sendStatus({
                    code: grpcStatus.PERMISSION_DENIED,
                    details: "forbidden",
                });
                return;
            }
        } catch (err: any) {
            if (err?.code === grpcStatus.UNAVAILABLE) {
                call.sendStatus({
                    code: grpcStatus.UNAVAILABLE,
                    details: "authorization service unavailable",
                });
                return;
            }
            call.sendStatus({
                code: grpcStatus.PERMISSION_DENIED,
                details: "forbidden",
            });
            return;
        }

        next();
    };
}

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

const server = new Server({
    interceptors: [
        kesselAuthInterceptor(kesselClient, "task", "TASKMANAGER", "view"),
    ],
});

// Register your service with the gRPC server.
// In a real project this would use the generated service definition:
//   server.addService(TaskServiceDefinition, { createTask, deleteTask });

server.bindAsync(
    "0.0.0.0:8080",
    ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error("failed to bind:", err);
            process.exit(1);
        }
        console.log(`serving on :${port}`);
    }
);

// ---------------------------------------------------------------------------
// Stubs (stand in for your protobuf-generated types and database layer)
// ---------------------------------------------------------------------------

interface CreateTaskRequest { title: string; workspaceId: string }
interface CreateTaskResponse { task: Task }
interface DeleteTaskRequest { id: string }
interface DeleteTaskResponse {}
interface Task { id: string; workspaceId: string; title: string; status: string }

const db = {
    insertTask: async (req: CreateTaskRequest): Promise<Task> => ({} as Task),
    deleteTask: async (id: string): Promise<void> => {},
};
