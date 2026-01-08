// example.ts - Runnable JavaScript/TypeScript SDK example
import { ResourceReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_reference";
import { SubjectReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/subject_reference";
import { CheckRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_request";
import { ReportResourceRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/report_resource_request";
import { ResourceRepresentations } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_representations";
import { RepresentationMetadata } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/representation_metadata";
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import "dotenv/config";

async function run() {
    //#region setup
    // For insecure local development:
    const client = new ClientBuilder(process.env.KESSEL_ENDPOINT).insecure().buildAsync();
    //#endregion

    try {
        //#region report
        const common = { workspace_id: "workspace-1" };
        const reporter = {
            document_id: "doc-123",
            document_name: "My Important Document",
            document_type: "document",
            created_at: "2025-08-31T10:30:00Z",
            file_size: 2048576,
            owner_id: "user-1",
        };
        const metadata: RepresentationMetadata = {
            localResourceId: "doc-123",
            apiHref: "https://drive.example.com/document/123",
            consoleHref: "https://www.console.com/drive/documents",
            reporterVersion: "2.7.16",
        };
        const representations: ResourceRepresentations = {
            metadata,
            common,
            reporter,
        };
        const reportResourceRequest: ReportResourceRequest = {
            type: "document",
            reporterType: "drive",
            reporterInstanceId: "drive-1",
            representations,
        };
        await client.reportResource(reportResourceRequest);
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
        console.log("Error during report or check:");
        console.log("Exception:", error);
    }
}

run();
