package org.project_kessel.examples;

import com.nimbusds.jose.util.Pair;
import io.grpc.ManagedChannel;
import org.project_kessel.api.auth.ClientConfigAuth;
import org.project_kessel.api.auth.OAuth2AuthRequest;
import org.project_kessel.api.auth.OAuth2ClientCredentials;
import org.project_kessel.api.auth.OIDCDiscovery;
import org.project_kessel.api.auth.OIDCDiscoveryMetadata;
import org.project_kessel.api.inventory.v1beta2.ClientBuilder;
import org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;
import org.project_kessel.api.rbac.v2.FetchWorkspace;
import org.project_kessel.api.rbac.v2.Workspace;

public class AuthExample {

    public static void main(String[] args) {
        String issuerUrl = System.getenv("ISSUER_URL");
        String clientId = System.getenv("CLIENT_ID");
        String clientSecret = System.getenv("CLIENT_SECRET");
        String kesselEndpoint = System.getenv("KESSEL_ENDPOINT");

        //#region discover
        // Option 1: Use OIDC discovery to find the token endpoint automatically
        OIDCDiscoveryMetadata discovery = OIDCDiscovery.fetchOIDCDiscovery(issuerUrl);
        OAuth2ClientCredentials credentials = new OAuth2ClientCredentials(
                new ClientConfigAuth(clientId, clientSecret, discovery.tokenEndpoint()));
        //#endregion

        //#region direct-token
        // Option 2: Provide the token endpoint URL directly
        String tokenEndpoint = System.getenv("TOKEN_ENDPOINT");
        credentials = new OAuth2ClientCredentials(
                new ClientConfigAuth(clientId, clientSecret, tokenEndpoint));
        //#endregion

        //#region build-client
        Pair<KesselInventoryServiceBlockingStub, ManagedChannel> clientAndChannel =
                new ClientBuilder(kesselEndpoint)
                        .oauth2ClientAuthenticated(credentials)
                        .build();
        KesselInventoryServiceBlockingStub client = clientAndChannel.getLeft();
        ManagedChannel channel = clientAndChannel.getRight();
        //#endregion

        channel.shutdown();

        //#region rbac-auth
        // Wrap credentials as an HTTP auth adapter for RBAC REST calls
        OAuth2AuthRequest auth = new OAuth2AuthRequest(credentials);

        Workspace rootWorkspace = FetchWorkspace.fetchRootWorkspace(
                System.getenv("RBAC_ENDPOINT"),
                System.getenv("ORG_ID"),
                auth);
        System.out.println("Root workspace: " + rootWorkspace.getName() + " (ID: " + rootWorkspace.getId() + ")");
        //#endregion
    }
}
