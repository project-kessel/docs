---
title: "{service}.{major_version}"
docType: client-package
package:
  name: "{service}.{major_version}"
  description: Package for code specific to service and API version. Contains generated client code and version-specific utilities.
  classes:
    - name: StubBuilder
      description: >
        Builder for constructing a stub following best practices and defaults. Constructors reference an explicit "default" configuration which clients are recommended to use.
      constructors:
        - description: Creates a new ClientBuilder with default configuration
          name: withDefaultsSecure
          params:
            - name: target
              type: string

        - description: Creates a ClientBuilder from a Configuration object
          params:
            - name: config
              type: Configuration
              description: Configuration object with common settings (server address, auth, etc.)
      methods:
        - name: withAuthentication
          description: Configures authentication method for the client
          params:
            - name: authMethod
              type: string
              description: Authentication method to use
            - name: credentials
              type: any
              description: Authentication credentials
          returns: ClientBuilder
        - name: withKeepAlive
          description: Configures HTTP/2 keepalive settings
          params:
            - name: keepAliveTime
              type: number
              description: Keepalive time in seconds
            - name: keepAliveTimeout
              type: number
              description: Keepalive timeout in seconds
          returns: ClientBuilder
        - name: build
          description: Constructs the service client stub for this API version
          returns: "{ServiceName}Client"
          errors:
            - ConfigurationError
            - ConnectionError
        - name: buildChannel
          description: Constructs the underlying gRPC channel
          returns: Channel
          errors:
            - ConfigurationError
    - name: Configuration
      description: Configuration object for common client settings with consistent keys across languages
      constructors:
        - description: Creates configuration from environment variables and defaults
        - description: Creates configuration with explicit values
          params:
            - name: serverAddress
              type: string
              description: The server address to connect to
            - name: authConfig
              type: AuthConfig
              description: Authentication configuration
      properties:
        - name: serverAddress
          type: string
          description: The gRPC server address
        - name: authConfig
          type: AuthConfig
          description: Authentication configuration
          readonly: true
        - name: tlsEnabled
          type: boolean
          description: Whether TLS is enabled for the connection
  types:
    - enum: AuthMethod
      description: Supported authentication methods
      values:
        - oauth2
        - bearer
        - none
  errors:
    - name: ConfigurationError
      description: Thrown when client configuration is invalid
    - name: ConnectionError
      description: Thrown when unable to establish connection to the server
---
