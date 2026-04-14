## Authentication

### OAuth 2.0 Client Credentials Flow
- Kessel uses OAuth 2.0 Client Credentials grant as the primary authentication mechanism for service-to-service communication.
- The `auth` package in each SDK provides `OAuth2ClientCredentials` class accepting `clientId`, `clientSecret`, and `tokenEndpoint`.
- Two methods to discover the token endpoint: OIDC Discovery via `fetchOIDCDiscovery(issuerUrl)` or a direct token URL.
- Token caching is built-in: cached tokens are reused until they expire within 5 minutes (300 seconds). Implementations must be thread-safe.
- `forceRefresh` parameter exists on `getToken()` but is explicitly discouraged ("NOT RECOMMENDED. Force with caution!").
- The `oAuth2AuthRequest` function wraps `OAuth2ClientCredentials` into an `AuthRequest` interface for injecting tokens into HTTP requests.
- In Python, prefer native auth constructs (e.g. `requests` library auth) over the generic `AuthRequest` interface.

### Credential Configuration
- Applications integrating with Kessel should expose these configuration options:
  - `KESSEL_ENABLED`, `KESSEL_URL`, `KESSEL_AUTH_ENABLED`
  - `KESSEL_AUTH_CLIENT_ID`, `KESSEL_AUTH_CLIENT_SECRET`, `KESSEL_AUTH_OIDC_ISSUER`
  - `KESSEL_INSECURE`
- Client credentials (client ID/secret) should be read from environment variables or secure config, not hardcoded. However, getting-started examples for local development may use inline placeholders to demonstrate the API surface.
- For OIDC validation in Kessel Inventory, configure the `authn.oidc` section with `authn-server-url`, `client-id`, `skip-client-id-check`, and `insecure-client`.

### Workspace ID Lookups and `x-rh-identity`
- When resolving workspace IDs from RBAC (`GET /api/rbac/v2/workspaces/?type=root|default`), do NOT relay the `x-rh-identity` header from the original request. The calling service must authenticate with its own OAuth token.
- Set `x-rh-rbac-org-id` header so RBAC identifies the correct account.
- This prevents failures when the end-user principal lacks workspace listing permissions.

## Transport Security (TLS)

### Client-side TLS Configuration
- OAuth 2.0 authentication requires TLS transport credentials; they are not independent.
- The `ClientBuilder` defaults to runtime-default TLS when no explicit `ChannelCredentials` are provided.
- For Kubernetes/OpenShift, mount CA certificates via ConfigMaps (e.g. `openshift-service-ca.crt` at `/ca-certs/service-ca.crt`).
- TLS setup follows a three-step pattern in all SDKs:
  1. Configure transport credentials (load CA certificate)
  2. Configure call credentials (OAuth 2.0)
  3. Combine both via the `ClientBuilder`

### ClientBuilder Security Modes
- `oauth2ClientAuthenticated(credentials, channelCredentials?)` -- Authenticated with OAuth 2.0 + TLS (production default).
- `authenticated(callCredentials?, channelCredentials?)` -- Generic authenticated mode.
- `unauthenticated(channelCredentials?)` -- TLS only, no client auth.
- `insecure()` -- No TLS, no auth. Only for local development and testing.

## Authorization Model (SpiceDB / Relationship-Based Access Control)

### Permission Schema (KSL Language)
- Permissions are defined in `.ksl` files using the KSL schema language, compiled to SpiceDB `.zed` schema via the `ksl` compiler.
- The RBAC model has five core types in the `rbac` namespace: `principal`, `group`, `role`, `role_binding`, `workspace`.
- Permissions flow through workspace hierarchy: `workspace -> role_binding -> role -> permission`. Workspaces support parent-child relationships for inheritance.
- Use `@rbac.add_permission(name:'permission_name')` extension to add permissions that propagate through role, role_binding, and workspace types.

### V1-to-V2 Migration Extensions
- `@rbac.add_v1_based_permission(app, resource, verb, v2_perm)` converts legacy RBACv1 permissions to Kessel, automatically generating wildcard permutations (`_all_` variants).
- Naming convention for v2 permissions: `read` becomes `view`, `write` becomes `edit`.
- `@rbac.add_contingent_permission(first, second, contingent)` creates compound permissions that require both conditions (e.g. `inventory_host_view AND patch_system_view_assigned`).
- Use the `_assigned` suffix for intermediate compound permissions; the contingent permission (without suffix) is what access checks should use.
- Schema files are stored per-environment in `rbac-config` repo (`configs/stage/schemas/src`, `configs/prod/...`).

### Check vs CheckForUpdate
- Use `Check` for standard read operations.
- Use `CheckForUpdate` for write operations and highly-sensitive read operations (e.g. reading credentials for connecting to a customer cluster). This provides stronger consistency guarantees.

### Constructing Authorization Requests
- Subject references for users follow the pattern: `resourceType: "principal"`, `resourceId: "redhat/{principalID}"`, `reporter.type: "rbac"`.
- `principalID` differs by principal type: `identity.User.UserId` for users, `identity.ServiceAccount.UserId` for service accounts.
- Workspace resources use `resourceType: "workspace"`, `reporter.type: "rbac"`.
- The `rbac.v2` SDK package provides convenience functions: `principalResource(id, domain)`, `principalSubject(id, domain)`, `workspaceResource(id)`, `roleResource(id)`, `subject(resourceRef, relation?)`.

### Role Bindings
- A role binding requires three relationship tuples created atomically:
  1. `role_binding -> granted -> role`
  2. `role_binding -> subject -> principal`
  3. `workspace -> user_grant -> role_binding`
- Use deterministic binding IDs derived from inputs (e.g. `{roleName}--{userId}--{resourceId}`).

## gRPC Security Conventions

### Package Isolation
- The `grpc` package must NOT import from peer packages (`auth`, `http`, `middleware`).
- `oauth2CallCredentials(credentials)` creates gRPC `CallCredentials` from `OAuth2ClientCredentials`, following the same patterns as `google-auth-*` libraries.
- Authentication middleware dependencies (e.g. `google-auth-*` libraries) may be included transitively as they are designed as library dependencies.
- Optional auth dependencies should NOT be pulled in transitively; use optional install extras (e.g. `pip install "kessel-sdk[auth]"` for Python).

### Network Configuration
- Deadlines, retries, load balancing must NOT be set by client defaults. They are discovered from the server via gRPC service config.
- HTTP/2 Keepalive is the exception and may be configured client-side.
- Channels and stubs should be reused per gRPC performance best practices to avoid creating new connections per request.

## Kafka Authentication
- For secured Kafka clusters, use SASL with SCRAM-SHA-512 mechanism.
- Required consumer configuration properties: `security-protocol: sasl_plaintext`, `sasl-mechanism: SCRAM-SHA-512`, `sasl-username`, `sasl-password`.

## Ephemeral Environment Authentication Setup
- Create service accounts via Stage IAM (`console.stage.redhat.com/iam/service-accounts`).
- Extract the `sub` claim from the JWT to configure system-level access in RBAC.
- Grant service account admin access by creating a `system-users` Kubernetes secret with the `sub` as key and `admin: true`, `is_service_account: true`, `allow_any_org: true`.
- Reconfigure RBAC to validate tokens against Stage SSO by setting `IT_BYPASS_TOKEN_VALIDATION=False` and `IT_SERVICE_HOST=sso.stage.redhat.com`.
- Kessel Inventory OIDC config points to `https://sso.stage.redhat.com/auth/realms/redhat-external`.

## Documentation Security Rules
- Avoid including real credentials, secrets, or tokens in documentation or example code. Use placeholders like `"your-client-id"`, `<PASSWORD>`, or environment variable references.
- Getting-started example code for local development uses `insecure()` mode with a clear comment indicating it is for local development only.
- TLS examples should demonstrate loading CA certificates, not disabling TLS verification.
- Internal documentation requiring authentication is served at separate URLs with GitHub org membership or VPN auth.
