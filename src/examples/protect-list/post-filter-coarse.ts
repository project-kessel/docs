import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import { CheckBulkRequestItem } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_bulk_request";
import { CheckBulkRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_bulk_request";
import { Allowed } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/allowed";
import { principalSubject, workspaceResource } from "@project-kessel/kessel-sdk/kessel/rbac/v2";

//#region setup
// Initialize Kessel client (see "Protect an endpoint" guide for full setup)
const client = new ClientBuilder("localhost:9000")
  .insecure()
  .buildAsync();
//#endregion

//#region filter-by-workspace
/**
 * Filter integrations by checking workspace permissions.
 *
 * Post-filtering (coarse): Check workspace-level permissions for unique workspaces.
 */
async function filterByWorkspacePermission(
  integrations: Integration[],
  userId: string,
  permission: string
): Promise<Integration[]> {
  // Step 1: Get unique workspace IDs
  const workspaceIds = Array.from(new Set(integrations.map(i => i.workspaceId)));

  // Step 2: Check workspace permissions with CheckBulk
  const items: CheckBulkRequestItem[] = workspaceIds.map(wsId => ({
    object: workspaceResource(wsId),
    relation: permission,
    subject: principalSubject(userId, "redhat"),
  }));

  const request: CheckBulkRequest = { items };
  const response = await client.checkBulk(request);

  // Step 3: Build set of allowed workspaces
  const allowedWorkspaces = new Set<string>();
  response.pairs?.forEach((pair, index) => {
    if (pair.item?.allowed === Allowed.ALLOWED_TRUE) {
      allowedWorkspaces.add(workspaceIds[index]);
    }
  });

  // Step 4: Filter resources by allowed workspaces
  return integrations.filter(i => allowedWorkspaces.has(i.workspaceId));
}
//#endregion

//#region full-example
/**
 * List integrations the user can access.
 *
 * Post-filtering (coarse): Query all integrations, then check workspace permissions.
 */
async function listIntegrations(db: Database, userId: string): Promise<Integration[]> {
  // Step 1: Query database
  const allIntegrations = await db.query("SELECT * FROM integrations WHERE status = 'active'");

  // Step 2: Filter by workspace permission
  const accessible = await filterByWorkspacePermission(
    allIntegrations,
    userId,
    "myservice_integration_view"
  );

  return accessible;
}

// Database interface placeholder
interface Database {
  query(sql: string): Promise<Integration[]>;
}

interface Integration {
  id: string;
  name: string;
  workspaceId: string;
}
//#endregion
