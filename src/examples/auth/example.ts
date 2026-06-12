import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import {
  fetchOIDCDiscovery,
  OAuth2ClientCredentials,
  oauth2AuthRequest,
} from "@project-kessel/kessel-sdk/kessel/auth";
import { fetchRootWorkspace } from "@project-kessel/kessel-sdk/kessel/rbac/v2";

async function main() {
  //#region discover
  // Option 1: Use OIDC discovery to find the token endpoint automatically
  const discovery = await fetchOIDCDiscovery(process.env.ISSUER_URL!);
  let credentials = new OAuth2ClientCredentials({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    tokenEndpoint: discovery.tokenEndpoint,
  });
  //#endregion

  //#region direct-token
  // Option 2: Provide the token endpoint URL directly
  credentials = new OAuth2ClientCredentials({
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    tokenEndpoint: process.env.TOKEN_ENDPOINT!,
  });
  //#endregion

  //#region build-client
  const client = new ClientBuilder(process.env.KESSEL_ENDPOINT!)
    .oauth2ClientAuthenticated(credentials)
    .buildAsync();
  //#endregion

  void client;

  //#region rbac-auth
  // Wrap credentials as an HTTP auth adapter for RBAC REST calls
  const auth = oauth2AuthRequest(credentials);

  const rootWorkspace = await fetchRootWorkspace(
    process.env.RBAC_ENDPOINT!,
    process.env.ORG_ID!,
    auth,
  );
  console.log(`Root workspace: ${rootWorkspace.name} (ID: ${rootWorkspace.id})`);
  //#endregion
}

main();
