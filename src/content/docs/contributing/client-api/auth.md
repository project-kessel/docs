---
title: "Package: auth"
docType: client-package
package:
  classes:
    - name: OAuth2ClientCredentials
      description: >-
        Credentials class implementing the OAuth 2.0 *Client Credentials* grant.
        Retrieves and refreshes access tokens from a **direct** OAuth 2.0 token
        endpoint (`token_url`) using the *Client Credentials* grant. Designed to
        integrate with `google-auth`’s credentials interface.
      constructors:
        - description: Initialize the credential helper.
          params:
            - { name: client_id,     type: string, description: OAuth 2.0 client identifier }
            - { name: client_secret, type: string, description: OAuth 2.0 client secret }
            - { name: token_url, type: string, description: OAuth 2.0 token endpoint URL }
      properties:
        - { name: token,  type: string,   description: Access token returned by the IdP }
        - { name: expiry, type: datetime, description: UTC expiry timestamp of the current token }
      methods:
        - name: refresh
          description: Fetch a fresh access token and update `token` / `expiry`.
          params:
            - { name: request, type: google.auth.transport.requests.Request, description: Unused transport request object required by google-auth }
    - name: OIDCDiscoveryMetadata
      description: Parsed OIDC discovery document exposing useful endpoints.
      properties:
        - { name: token_endpoint, type: string, description: OAuth 2.0 token endpoint URL advertised by the provider }

  errors:
    - { name: ValueError, description: Raised when required configuration is missing or malformed }
    - { name: IOError,   description: Raised when OIDC discovery fails due to network issues }

  # ──────────────────── OIDC discovery helpers ────────────────────

  functions:
    - name: fetchOIDCDiscovery
      description: Retrieve and parse the OIDC discovery document for the given issuer.
      params:
        - { name: issuer_url, type: string, description: Base URL of the OIDC issuer }
      returns: OIDCDiscoveryMetadata
---
