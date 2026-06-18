import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import { principalSubject, listWorkspaces } from "@project-kessel/kessel-sdk/kessel/rbac/v2";

//#region setup
// Initialize Kessel client (see "Protect an endpoint" guide for full setup)
const client = new ClientBuilder("localhost:9000")
  .insecure()
  .buildAsync();
//#endregion

//#region get-workspaces
/**
 * Get all workspaces the user can access with the given permission.
 *
 * This uses the listWorkspaces helper from kessel.rbac.v2 which
 * handles StreamedListObjects pagination automatically.
 */
async function getAccessibleWorkspaces(userId: string, permission: string): Promise<string[]> {
  const subject = principalSubject(userId, "redhat");

  const workspaceIds: string[] = [];
  for await (const response of listWorkspaces(client, subject, permission)) {
    if (response.object?.resourceId) {
      workspaceIds.push(response.object.resourceId);
    }
  }

  return workspaceIds;
}
//#endregion

//#region filter-query
/**
 * List integrations the user can access.
 *
 * Pre-filtering: Get allowed workspaces first, then query only those.
 */
async function listIntegrations(db: Database, userId: string): Promise<Integration[]> {
  // Step 1: Get workspaces the user can access
  const allowedWorkspaces = await getAccessibleWorkspaces(userId, "myservice_integration_view");

  if (allowedWorkspaces.length === 0) {
    return [];
  }

  // Step 2: Query database with workspace filter
  const integrations = await db.query(
    "SELECT * FROM integrations WHERE workspace_id = ANY($1)",
    [allowedWorkspaces]
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
