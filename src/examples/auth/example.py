import os
from kessel.auth import OAuth2ClientCredentials, fetch_oidc_discovery, oauth2_auth_request
from kessel.inventory.v1beta2 import ClientBuilder
from kessel.rbac.v2 import fetch_root_workspace


def main():
    # region discover
    # Option 1: Use OIDC discovery to find the token endpoint automatically
    discovery = fetch_oidc_discovery(os.getenv("ISSUER_URL"))
    credentials = OAuth2ClientCredentials(
        client_id=os.getenv("CLIENT_ID"),
        client_secret=os.getenv("CLIENT_SECRET"),
        token_endpoint=discovery.token_endpoint,
    )
    # endregion

    # region direct-token
    # Option 2: Provide the token endpoint URL directly
    credentials = OAuth2ClientCredentials(
        client_id=os.getenv("CLIENT_ID"),
        client_secret=os.getenv("CLIENT_SECRET"),
        token_endpoint=os.getenv("TOKEN_ENDPOINT"),
    )
    # endregion

    # region build-client
    stub, channel = (
        ClientBuilder(os.getenv("KESSEL_ENDPOINT"))
        .oauth2_client_authenticated(credentials)
        .build()
    )
    # endregion

    channel.close()

    # region rbac-auth
    # Wrap credentials as an HTTP auth adapter for RBAC REST calls
    auth = oauth2_auth_request(credentials)

    root_workspace = fetch_root_workspace(
        rbac_base_endpoint=os.getenv("RBAC_ENDPOINT"),
        org_id=os.getenv("ORG_ID"),
        auth=auth,
    )
    print(f"Root workspace: {root_workspace.name} (ID: {root_workspace.id})")
    # endregion


if __name__ == "__main__":
    main()
