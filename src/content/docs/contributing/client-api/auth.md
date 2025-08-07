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
            - name: clientId
              type: string
              description: OAuth 2.0 client identifier
            - name: clientSecret
              type: string
              description: OAuth 2.0 client secret
            - name: tokenEndpoint
              type: string
              description: OAuth 2.0 token endpoint URL
      methods:
        - name: getToken
          description: |
            Obtains a valid token for the client. If `forceRefresh` is set to `true`, a new token is
            fetched and cached regardless of the current token’s expiry. The cached token
            is returned when it does not expire in the next 5 minutes (300 seconds). Otherwise, a 
            new one is fetched and cached. 

            Implementations must be thread-safe.
          params:
            - name: forceRefresh
              type: boolean
              default: "false"
              description: "Set to true to bypass the cache and fetch a new token (default: false). NOT RECOMMENDED. Force with caution!"
          returns: RefreshTokenResponse
    - name: RefreshTokenResponse
      description: Parsed token data
      properties:
        - name: accessToken
          type: string
          description: OAuth 2.0 token
        - name: expiresAt
          type: Datetime
          description: Token's expiration time.
    - name: OIDCDiscoveryMetadata
      description: Parsed OIDC discovery document exposing useful endpoints.
      properties:
        - name: tokenEndpoint
          type: string
          description: OAuth 2.0 token endpoint URL advertised by the provider
  functions:
    - name: fetchOIDCDiscovery
      description: >
        Retrieve and parse the OIDC discovery document for the given issuer. See: https://openid.net/specs/openid-connect-discovery-1_0.html
      params:
        - name: issuerUrl
          type: string
          description: Base URL of the OIDC issuer
      returns: OIDCDiscoveryMetadata
---

The `auth` package defines generic authentication abstractions that are usable across multiple protocols.
