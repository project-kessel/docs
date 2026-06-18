import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import { StreamedListObjectsRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/streamed_list_objects_request";
import { RepresentationType } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/representation_type";
import { principalSubject } from "@project-kessel/kessel-sdk/kessel/rbac/v2";

//#region setup
// Initialize Kessel client (see "Protect an endpoint" guide for full setup)
const client = new ClientBuilder("localhost:9000")
  .insecure()
  .buildAsync();
//#endregion

//#region get-resource-ids
/**
 * Get all resource IDs the user can access with the given permission.
 *
 * This uses StreamedListObjects with your specific resource type to find
 * exactly which resource IDs the user can access.
 */
async function getAccessibleResourceIds(userId: string, permission: string): Promise<string[]> {
  const subject = principalSubject(userId, "redhat");
  const resourceType: RepresentationType = {
    resourceType: "integration",
    reporterType: "myservice"
  };

  const request: StreamedListObjectsRequest = {
    objectType: resourceType,
    relation: permission,
    subject: subject
  };

  // Get accessible resource IDs
  const resourceIds: string[] = [];
  for await (const response of client.streamedListObjects(request)) {
    if (response.object?.resourceId) {
      resourceIds.push(response.object.resourceId);
    }
  }

  return resourceIds;
}
//#endregion

//#region filter-query
/**
 * List integrations the user can access.
 *
 * Pre-filtering (fine-grained): Get allowed resource IDs first, then query only those.
 */
async function listIntegrations(db: Database, userId: string): Promise<Integration[]> {
  // Step 1: Get resource IDs the user can access
  const allowedIds = await getAccessibleResourceIds(userId, "view");

  if (allowedIds.length === 0) {
    return [];
  }

  // Step 2: Query database with resource ID filter
  const integrations = await db.query(
    "SELECT * FROM integrations WHERE id = ANY($1)",
    [allowedIds]
  );

  return integrations;
}

// Database interface placeholder
interface Database {
  query(sql: string, params: any[]): Promise<Integration[]>;
}

interface Integration {
  id: string;
  name: string;
  workspaceId: string;
}
//#endregion
