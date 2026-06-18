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

//#region bulk-check
/**
 * Filter integrations using CheckBulk to batch permission checks.
 *
 * This is more efficient than calling Check() in a loop.
 */
async function filterIntegrationsByPermission(
  integrations: Integration[],
  userId: string,
  permission: string
): Promise<Integration[]> {
  // Build bulk check request with one item per integration
  const items: CheckBulkRequestItem[] = integrations.map((integration) => ({
    object: workspaceResource(integration.workspaceId),
    relation: permission,
    subject: principalSubject(userId, "redhat"),
  }));

  const request: CheckBulkRequest = { items };

  // Make single API call to check all permissions
  const response = await client.checkBulk(request);

  // Filter integrations based on bulk check results
  const accessibleIntegrations: Integration[] = [];
  response.pairs?.forEach((pair, index) => {
    if (pair.item?.allowed === Allowed.ALLOWED_TRUE) {
      accessibleIntegrations.push(integrations[index]);
    }
  });

  return accessibleIntegrations;
}
//#endregion

//#region full-example
/**
 * List integrations the user can access.
 *
 * Post-filtering with CheckBulk: Query all integrations, then batch-check permissions.
 */
async function listIntegrations(db: Database, userId: string): Promise<Integration[]> {
  // Step 1: Query all integrations from database
  const allIntegrations = await db.query("SELECT * FROM integrations");

  // Step 2: Use CheckBulk to filter by permission
  const accessible = await filterIntegrationsByPermission(
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
