---
title: "Package: auth"
docType: client-package
package:
  classes:
    - name: OAuth2ClientCredentials
      description: >-
        Credentials class implementing the OAuth 2.0 *Client Credentials* grant.
        Retrieves and refreshes access tokens from a **direct** OAuth 2.0 token
        endpoint (`token_url`) using the *Client Credentials* grant. 
      constructors:
        - description: Initialize the credential helper.
          params:
            - { name: client_id,     type: string, description: OAuth 2.0 client identifier }
            - { name: client_secret, type: string, description: OAuth 2.0 client secret }
            - { name: token_endpoint, type: string, description: OAuth 2.0 token endpoint URL }
      methods:
        - name: getToken
          description: |
            Preferred method for obtaining a token. Returns the cached token if it does not expire
            in the next 5 minutes (300 seconds) or loads a new one, caching it prior to returning it.
            It must be thread safe.
        - name: refresh
          description: Fetch a new access token.
          returns: RefreshTokenResponse
    - name: RefreshTokenResponse
      description: Parsed token data
      properties:
        - { name: access_token, type: string, description: OAuth 2.0 token }
        - { name: expire_in, type: integer, description: Number of seconds the token will be valid for }
    - name: OIDCDiscoveryMetadata
      description: Parsed OIDC discovery document exposing useful endpoints.
      properties:
        - { name: token_endpoint, type: string, description: OAuth 2.0 token endpoint URL advertised by the provider }

  # ──────────────────── OIDC discovery helpers ────────────────────

  functions:
    - name: fetchOIDCDiscovery
      description: Retrieve and parse the OIDC discovery document for the given issuer.
      params:
        - { name: issuer_url, type: string, description: Base URL of the OIDC issuer }
      returns: OIDCDiscoveryMetadata
---
