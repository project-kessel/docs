---
title: "Package: auth"
docType: client-package
package:
  name: auth
  description: Package for authentication abstractions not specific to protocol.
  classes:
    - name: OAuth2ClientCredentials
      description: Encapsulates OAuth2 client credentials, following google-auth-* library patterns.
      constructors:
        - description: Creates OAuth2 client credentials for gRPC authentication
          params:
            - name: tokenUrl
              type: string
              description: The URL for the OAuth2 token endpoint
            - name: clientId
              type: string
              description: The OAuth2 client identifier
            - name: clientSecret
              type: string
              description: The OAuth2 client secret
      methods:
        - name: getCallCredentials
          description: Returns gRPC CallCredentials configured with OAuth2 authentication
          returns: CallCredentials
          errors:
            - AuthenticationError
  functions:
    - name: createCallCredentials
      description: Utility function to create CallCredentials for recommended Kessel authentication methods
      params:
        - name: authMethod
          type: string
          description: The authentication method (e.g., "oauth2", "bearer")
        - name: credentials
          type: any
          description: Authentication credentials object
      returns: CallCredentials
      errors:
        - AuthenticationError
        - UnsupportedAuthMethodError
  errors:
    - name: AuthenticationError
      description: Thrown when authentication fails or credentials are invalid
    - name: UnsupportedAuthMethodError
      description: Thrown when an unsupported authentication method is specified
---
