---
title: "Package: auth"
docType: client-package
package:
  interfaces:
    - name: AuthRequest
      description: |
        Object used to perform authenticated HTTP requests. 
        In languages where such constructs are already provided (e.g. python, see [1]), they should be used instead of this object to take
        advantage of the existing ecosystem.
        
        This can be created from the [OAuth2ClientCredentials](#class-OAuth2ClientCredentials) Object by using [oauth2AuthRequest](#functions-oAuth2AuthRequest).
        
        [1] https://requests.readthedocs.io/en/latest/user/authentication/
      methods:
        - name: configureRequest
          description: |
            Configures the HTTP request as needed to use a specific authorization type.
            This method allows adopters to implement a specific authorization type depending their environment.
          params:
            - name: request
              type: 
                name: Request
              description: |
                Request or equivalent object used in the language.
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
              type:
                name: string
              description: OAuth 2.0 client identifier
            - name: clientSecret
              type:
                name: string
              description: OAuth 2.0 client secret
            - name: tokenEndpoint
              type:
                name: string
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
              type:
                name: boolean
              optional: true
              description: "Set to true to bypass the cache and fetch a new token (default: false). NOT RECOMMENDED. Force with caution!"
          returns:
            name: RefreshTokenResponse
            link: "#class-RefreshTokenResponse"
    - name: RefreshTokenResponse
      description: Parsed token data
      properties:
        - name: accessToken
          type:
            name: string
          description: OAuth 2.0 token
        - name: expiresAt
          type:
            name: Datetime
          description: Token's expiration time.
    - name: OIDCDiscoveryMetadata
      description: Parsed OIDC discovery document exposing useful endpoints.
      properties:
        - name: tokenEndpoint
          type:
            name: string
          description: OAuth 2.0 token endpoint URL advertised by the provider
  functions:
    - name: fetchOIDCDiscovery
      description: >
        Retrieve and parse the OIDC discovery document for the given issuer. See: https://openid.net/specs/openid-connect-discovery-1_0.html
      params:
        - name: issuerUrl
          type:
            name: string
          description: Base URL of the OIDC issuer
      returns:
        name: OIDCDiscoveryMetadata
        link: "#class-OIDCDiscoveryMetadata"
    - name: oAuth2AuthRequest
      description: |
        Wraps an [OAuth2ClientCredentials](#class-OAuth2ClientCredentials) object into an [AuthRequest](#interface-AuthRequest) (or the specific construct used in the language) 
        to allow injecting the token provided by the [OAuth2ClientCredentials](#class-OAuth2ClientCredentials) into the request.
      params:
        - name: oAuth2ClientCredentials
          type:
            name: OAuth2ClientCredentials
            link: "#class-OAuth2ClientCredentials"
          description: OAuth token provider used to authenticate the requests.
      returns:
        name: AuthRequest
        link: "#interface-AuthRequest"
---

The `auth` package defines generic authentication abstractions that are usable across multiple protocols.
