// example.ts - Runnable JavaScript/TypeScript SDK example
import { ResourceReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_reference";
import { SubjectReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/subject_reference";
import { CheckRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_request";
import { AddResourceRelationshipsRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/add_resource_relationships_request";
import { RemoveResourceRelationshipsRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/remove_resource_relationships_request";
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import "dotenv/config";

async function run() {
    //#region setup
    // For insecure local development:
    const client = new ClientBuilder(process.env.KESSEL_ENDPOINT).insecure().buildAsync();
    //#endregion

    try {
        //#region create
        // Add a workspace relationship to a document that has not been
        // reported yet: the resource is created with the provided
        // relationship values.
        const createCommon = { workspace_id: "workspace-2" };
        const createRequest: AddResourceRelationshipsRequest = {
            type: "document",
            reporterType: "drive",
            reporterInstanceId: "drive-1",
            localResourceId: "doc-456",
            common: createCommon,
        };
        await client.addResourceRelationships(createRequest);
        //#endregion

        //#region remove
        // First step of changing a single-valued relationship: remove the
        // existing value. Removing a value that is not present is an
        // idempotent no-op. Requires doc-123 to be reported with workspace-1
        // first; see the getting-started report example.
        const removeCommon = { workspace_id: "workspace-1" };
        const removeRequest: RemoveResourceRelationshipsRequest = {
            type: "document",
            reporterType: "drive",
            reporterInstanceId: "drive-1",
            localResourceId: "doc-123",
            common: removeCommon,
        };
        await client.removeResourceRelationships(removeRequest);
        //#endregion

        //#region add
        // Second step of changing a single-valued relationship: add the
        // replacement value. Adding a second value without removing the
        // existing one first is rejected with INVALID_ARGUMENT.
        const addCommon = { workspace_id: "workspace-2" };
        const addRequest: AddResourceRelationshipsRequest = {
            type: "document",
            reporterType: "drive",
            reporterInstanceId: "drive-1",
            localResourceId: "doc-123",
            common: addCommon,
        };
        await client.addResourceRelationships(addRequest);
        //#endregion

        //#region check
        // NOTE: You may need to wait for replication and caches to update.
        const subjectReference: SubjectReference = {
            resource: {
                reporter: { type: "rbac" },
                resourceId: "sarah",
                resourceType: "principal",
            },
        };
        const resource: ResourceReference = {
            reporter: { type: "drive" },
            resourceId: "doc-123",
            resourceType: "document",
        };
        const check_request: CheckRequest = {
            object: resource,
            relation: "view",
            subject: subjectReference,
        };
        const response = await client.check(check_request);
        console.log("Check response received successfully:");
        console.log(response);
        //#endregion
    } catch (error) {
        console.log("Error during add, remove, or check:");
        console.log("Exception:", error);
    }
}

run();
