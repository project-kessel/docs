import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import { Allowed } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/allowed";
import type { CheckRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_request";
import type { ReportResourceRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/report_resource_request";
import type {
    ServerUnaryCall,
    sendUnaryData,
    handleUnaryCall,
    Metadata,
    ServerInterceptingCall,
} from "@grpc/grpc-js";
import { status as grpcStatus } from "@grpc/grpc-js";

//#region client-setup
async function createKesselClient() {
    return new ClientBuilder(process.env.KESSEL_ENDPOINT!)
        .insecure()
        .buildAsync();
}
//#endregion

const kesselClient = await createKesselClient();

//#region report-on-create
const createTask: handleUnaryCall<CreateTaskRequest, CreateTaskResponse> = async (
    call: ServerUnaryCall<CreateTaskRequest, CreateTaskResponse>,
    callback: sendUnaryData<CreateTaskResponse>
) => {
    // --- Your existing service logic ---
    const task = await db.insertTask(call.request);

    // --- Report to Kessel ---
    const reportRequest: ReportResourceRequest = {
        type: "task",
        reporterType: "TASKMANAGER",
        reporterInstanceId: process.env.REPORTER_INSTANCE_ID ?? "taskmanager-1",
        representations: {
            metadata: {
                localResourceId: task.id,
                apiHref: `${process.env.BASE_URL}/api/tasks/${task.id}`,
            },
            common: { workspace_id: task.workspaceId },
            reporter: { title: task.title, status: task.status },
        },
    };

    try {
        await kesselClient.reportResource(reportRequest);
    } catch (err) {
        // Log but don't fail. The resource exists in your database;
        // Kessel will catch up on the next report or reconciliation.
        console.warn(`kessel: failed to report task ${task.id}:`, err);
    }

    callback(null, { task });
};
//#endregion

//#region check-middleware
function kesselAuthInterceptor(
    kesselClient: Awaited<ReturnType<typeof createKesselClient>>,
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
            const response = await kesselClient.check(checkRequest);
            if (response.allowed !== Allowed.ALLOWED_TRUE) {
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

// Wire it up when creating the gRPC server:
//
//   const server = new grpc.Server({
//       interceptors: [
//           kesselAuthInterceptor(kesselClient, "task", "TASKMANAGER", "view"),
//       ],
//   });
//   server.addService(TaskServiceDefinition, { createTask });
//#endregion

// Type stubs for compilation context.
interface CreateTaskRequest { title: string; workspaceId: string }
interface CreateTaskResponse { task: Task }
interface Task { id: string; workspaceId: string; title: string; status: string }
const db = { insertTask: async (req: CreateTaskRequest): Promise<Task> => ({} as Task) };
