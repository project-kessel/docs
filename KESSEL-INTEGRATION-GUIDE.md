# Kessel Integration Guide

This guide consolidates consumer and integrator knowledge for teams building on the Kessel platform. It covers API contracts, SDK conventions, authentication, authorization, database schema, data replication, and monitoring patterns.

This content is leveraged by CodeRabbit for context during PR reviews. Eventually it will be distilled into CodeRabbit `path_instructions` for targeted review guidance in service provider code bases.

## Platform Architecture

- Kessel consists of two core services: **Inventory API** (resource storage and reporting) and **Relations API + SpiceDB** (relationship-based access control). The Relations API is planned to merge into Inventory.
- The primary protocol is **gRPC** with protobuf. HTTP REST is supported but secondary and may lack features like streaming.
- API definitions live in external repos. The gRPC spec is on [Buf Schema Registry](https://buf.build/project-kessel/inventory-api), and the OpenAPI spec is pulled from `project-kessel/inventory-api` at build time.
- The current API version is **v1beta2**. References to v1beta1 are deprecated and belong under `archive/`.

## API Contracts

### Versioning

- **Inventory API** uses **v1beta2** as the current version. The v1beta1 API is deprecated and archived.
- **Relations API** uses **v1beta1** for all protos.
- API paths follow the pattern `/api/kessel/{api-version}/...` (e.g., `/api/kessel/v1beta2/resources` for inventory).
- gRPC service names use the pattern `kessel.{service}.{version}.{ServiceName}`:
  - Inventory: `kessel.inventory.v1beta2.KesselInventoryService`
  - Relations: `kessel.relations.v1beta1.KesselTupleService`
- Protobuf definitions are hosted on the Buf Schema Registry at `buf.build/project-kessel/inventory-api` and `buf.build/project-kessel/relations-api`.
- The OpenAPI spec is pulled from `https://raw.githubusercontent.com/project-kessel/inventory-api/refs/heads/main/openapi.yaml`.

### ReportResource Request Structure (v1beta2)

The `ReportResourceRequest` protobuf message requires:
- `type` -- resource type string (e.g., `"document"`)
- `reporter_type` -- reporter identifier (e.g., `"drive"`)
- `reporter_instance_id` -- unique reporter instance
- `representations` containing:
  - `metadata` (`RepresentationMetadata`): `local_resource_id`, `api_href`, `console_href`, `reporter_version`
  - `common` (`google.protobuf.Struct`): shared attributes across reporters (e.g., `workspace_id`)
  - `reporter` (`google.protobuf.Struct`): reporter-specific attributes

### Check Request Structure (v1beta2)

The `CheckRequest` requires:
- `object` (`ResourceReference`): `resource_type`, `resource_id`, `reporter` (`ReporterReference` with `type`)
- `relation` -- permission to check (e.g., `"view"`)
- `subject` (`SubjectReference`): contains a `resource` (`ResourceReference`) identifying the subject

Principals use `resource_type: "principal"` with `reporter.type: "rbac"`.

### CloudEvents Schema

Events follow CloudEvents 1.0 with these Kessel conventions:
- `type`: `redhat.inventory.resources.{resource_type}.{operation}` where operation is `created`, `updated`, or `deleted`
- `type` for relationships: `redhat.inventory.resources-relationship.{relationship_type}.{operation}`
- `subject`: `/resources/{resource_type}/{id}` or `/resources-relationships/{relationship_type}/{id}`
- `source`: the inventory API URI
- `datacontenttype`: always `"application/json"`
- `data` payload contains `metadata`, `reporter_data`, and `resource_data` (or `relationship_data`)

### Resource Schema Configuration

Resource types are configured via a directory structure under `data/schema/resources/` in the inventory-api repository:

```
{resource_type}/
  config.yaml              # resource_type name + list of reporters
  common_representation.json  # JSON Schema for shared attributes
  reporters/{reporter}/
    config.yaml            # reporter_name + namespace
    {resource_type}.json   # JSON Schema for reporter-specific attributes
```

- `config.yaml` lists `resource_type` and `resource_reporters`
- Reporter `config.yaml` specifies `resource_type`, `reporter_name`, and `namespace`
- JSON Schemas use draft-07

### Relations API (Tuples)

- Roles are created by writing tuples to `kessel.relations.v1beta1.KesselTupleService.CreateTuples`.
- Resource/subject references use `type.name` + `type.namespace` (e.g., `name: "role", namespace: "rbac"`).
- Role bindings require three tuples in a single `CreateTuples` call: binding->granted->role, binding->subject->principal, workspace->user_grant->binding.
- Binding IDs follow the deterministic pattern `{role}--{user}--{resource}`.

## SDKs and Client Libraries

### Import Conventions

- SDKs are scoped to **Kessel as a whole**, not individual services. Import prefixes include "kessel" (e.g., `kessel.inventory.v1beta2`, `@project-kessel/kessel-sdk`).
- Import hierarchy follows the pattern `{prefix}.{service}.{major_version}` and is consistent across languages:
  - `{prefix}.auth` -- generic authentication abstractions
  - `{prefix}.grpc` -- gRPC-specific utilities (must not import peer packages)
  - `{prefix}.http` -- HTTP-specific utilities (must not import peer packages)
  - `{prefix}.middleware` -- transport-agnostic middleware
  - `{prefix}.{service}.{major_version}` -- version-specific generated code and utilities
- Case conventions follow each language's idioms (e.g., `snake_case` in Python, `camelCase` in JS/TS) but the specification uses JavaScript conventions as canonical.
- Client stubs are generated from API specifications using `buf` for gRPC and `openapi-generator` for HTTP. Generation is reproducible with pinned plugin versions.
- SDKs exist for **Go**, **Python**, **TypeScript/JavaScript**, **Ruby**, and **Java**. Repos follow naming `kessel-sdk-{lang}`.

### ClientBuilder Pattern

Every `{service}.{major_version}` package exposes a `ClientBuilder` class:

- Constructor takes a `target` URI string (gRPC endpoint).
- Authentication methods: `oauth2ClientAuthenticated(credentials)`, `authenticated(callCredentials, channelCredentials)`, `unauthenticated(channelCredentials)`, `insecure()`.
- `build()` returns the stub (and channel if the stub lacks `close()`). `buildAsync()` is required for Python and JavaScript.
- Default behavior: TLS with runtime default trust bundle. No deadlines, retries, or load balancing -- these come from gRPC service config.
- Insecure mode is only for local development/testing.
- `build()` returns a tuple `(Stub, Closeable)` when the stub lacks a `close()` method (Python, Go). In Go: `inventoryClient, conn, err := v1beta2.NewClientBuilder(target).Insecure().Build()`.
- The `ClientBuilder` may offer a `cacheKey` parameter: if provided, it either creates a new channel/stub or retrieves a cached one using the same key value. Same key assumes same configuration.
- Channel/stub lifecycle should be managed by the application (e.g. through DI containers). SDK code must not manage global lifecycle silently.

### Dependency Rules

- SDKs do not depend on server code, and servers do not depend on SDKs.
- Protocol dependencies (gRPC/protobuf) may be transitive. Non-protocol dependencies (e.g., OAuth libraries) should be optional unless the package is explicitly branded for that integration.
- Exception: google-auth-* libraries for gRPC authentication should be included transitively.

## Authentication and Security

### OAuth 2.0 Client Credentials Flow

- Kessel uses OAuth 2.0 Client Credentials grant as the primary authentication mechanism for service-to-service communication.
- The `auth` package in each SDK provides `OAuth2ClientCredentials` class accepting `clientId`, `clientSecret`, and `tokenEndpoint`.
- Two methods to discover the token endpoint: OIDC Discovery via `fetchOIDCDiscovery(issuerUrl)` or a direct token URL.
- Token caching is built-in: cached tokens are reused until they expire within 5 minutes (300 seconds). Implementations must be thread-safe.
- `forceRefresh` parameter exists on `getToken()` but is explicitly discouraged ("NOT RECOMMENDED. Force with caution!").
- The `oAuth2AuthRequest` function wraps `OAuth2ClientCredentials` into an `AuthRequest` interface for injecting tokens into HTTP requests.
- In Python, prefer native auth constructs (e.g. `requests` library auth) over the generic `AuthRequest` interface.
- Token fetching is lazy -- no network calls until the first `getToken()` invocation.
- OAuth2 token management includes automatic retry on authentication failures.

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

### Transport Security (TLS)

- OAuth 2.0 authentication requires TLS transport credentials; they are not independent.
- The `ClientBuilder` defaults to runtime-default TLS when no explicit `ChannelCredentials` are provided.
- For Kubernetes/OpenShift, mount CA certificates via ConfigMaps (e.g. `openshift-service-ca.crt` at `/ca-certs/service-ca.crt`).
- TLS setup follows a three-step pattern in all SDKs:
  1. Configure transport credentials (load CA certificate)
  2. Configure call credentials (OAuth 2.0)
  3. Combine both via the `ClientBuilder`

**ClientBuilder Security Modes:**
- `oauth2ClientAuthenticated(credentials, channelCredentials?)` -- Authenticated with OAuth 2.0 + TLS (production default).
- `authenticated(callCredentials?, channelCredentials?)` -- Generic authenticated mode.
- `unauthenticated(channelCredentials?)` -- TLS only, no client auth.
- `insecure()` -- No TLS, no auth. Only for local development and testing.

### Kafka Authentication

- For secured Kafka clusters, use SASL with SCRAM-SHA-512 mechanism.
- Required consumer configuration properties: `security-protocol: sasl_plaintext`, `sasl-mechanism: SCRAM-SHA-512`, `sasl-username`, `sasl-password`.

### Ephemeral Environment Authentication Setup

- Create a service account in your SSO provider's IAM console.
- Extract the `sub` claim from the JWT to configure system-level access in RBAC.
- Grant the service account admin access by creating a `system-users` Kubernetes secret with the `sub` as key and appropriate role flags.
- Reconfigure RBAC to validate tokens against your SSO provider instead of bypassing validation.
- Point Kessel Inventory's OIDC config at your SSO provider's realm URL.
- For Red Hat-specific environment setup (stage URLs, secret values, SSO configuration), see the internal docs available in InScope.

## Authorization Model (SpiceDB / RBAC)

### Permission Schema (KSL Language)

- Permissions are defined in `.ksl` files using the KSL schema language (version 0.1), compiled to SpiceDB `.zed` schema via the `ksl` compiler.
- The RBAC model has five core types in the `rbac` namespace: `principal`, `group`, `role`, `role_binding`, `workspace`.
- Permissions flow through workspace hierarchy: `workspace -> role_binding -> role -> permission`. Workspaces support parent-child relationships for inheritance.
- Use `@rbac.add_permission(name:'permission_name')` extension to add permissions that propagate through role, role_binding, and workspace types.
- Built-in schemas (`kessel.ksl`, `rbac.ksl`) are present in examples. Custom schemas import `rbac` and use extensions.
- Resource types declare `relation workspace: [ExactlyOne rbac.workspace]` and derive permissions from workspace-level grants: `relation view: workspace.view_document`.

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

## gRPC Conventions

### Channel and Stub Reuse

- Library documentation and abstractions must guide users to reuse gRPC Channels and Stubs, per [gRPC performance best practices](https://grpc.io/docs/guides/performance/).
- `build()` must return a tuple `(Stub, Closeable)` when the stub lacks a `close()` method, ensuring explicit resource cleanup to prevent connection leaks.

### Network Defaults and Service Config

- Deadlines, retries, load balancing, and other network-level behavior must NOT be specified by client defaults. These must be defined by the server and discovered by the client through [gRPC service config](https://github.com/grpc/proposal/blob/master/A2-service-configs-in-dns.md).
- HTTP/2 Keepalive is an exception -- it requires explicit client-side channel configuration and is not available through service config. The `ClientBuilder` default configuration does NOT include keep alive.
- The `dns://` URI scheme triggers DNS-based name resolution and service configuration discovery from TXT records. Omitting a scheme defaults to `dns`.

### Package Isolation

- The `grpc` package must NOT import from peer packages (`auth`, `http`, `middleware`).
- `oauth2CallCredentials(credentials)` creates gRPC `CallCredentials` from `OAuth2ClientCredentials`, following the same patterns as `google-auth-*` libraries.
- Authentication middleware dependencies (e.g. `google-auth-*` libraries) may be included transitively as they are designed as library dependencies.
- Optional auth dependencies should NOT be pulled in transitively; use optional install extras (e.g. `pip install "kessel-sdk[auth]"` for Python).

### Error Handling by Language

Each example should follow the idiomatic error-handling pattern for its language:

- **Go**: Use `status.FromError(err)` to extract gRPC status codes. Switch on `codes.Unavailable`, `codes.PermissionDenied`, etc. Use `log.Fatal` or `log.Fatalf` for unrecoverable errors. Wrap errors with `fmt.Errorf("context: %w", err)`.
- **Python**: Catch `grpc.RpcError` specifically (not generic `Exception`). Log both `e.code()` and `e.details()`.
- **Java**: Catch `io.grpc.StatusRuntimeException`. Do not catch generic `Exception` for gRPC errors.
- **TypeScript/JavaScript**: Use generic `catch (error)` blocks (gRPC-js does not expose a typed error class).
- **Ruby**: Use `rescue => e` blocks and print both the error class and message.

**Do NOT wrap gRPC exceptions:** Client SDKs SHOULD define their own top-level error type only for errors NOT thrown by gRPC. gRPC exceptions SHOULD NOT be wrapped by the SDK.

### Connection Lifecycle

- Go examples should use `defer conn.Close()` and handle the close error (log, do not fatal).
- Python examples should use `with channel:` context manager for cleanup.
- Java examples should call `channel.shutdown()` in a `finally` block.

### TLS Configuration Errors

Go TLS examples should return descriptive wrapped errors:
```go
return nil, fmt.Errorf("failed to read the ca cert file: %w", err)
return nil, fmt.Errorf("failed to add server CA certificate")
```

Python TLS examples should let file I/O errors propagate naturally (no explicit catch needed for cert loading), but gRPC call errors after TLS setup should catch `grpc.RpcError`.

### Compilation in CI/CD

- When compiling gRPC from source (Python/Ruby only), limit parallel compilation to prevent CI timeouts caused by double parallelism (package manager + C compiler):
  - Python: set `GRPC_PYTHON_BUILD_EXT_COMPILER_JOBS=4`
  - Ruby: set `GRPC_RUBY_BUILD_PROCS=4`, `MAKEFLAGS="-j4"`, and `BUNDLE_JOBS=4`
- Node.js (`@grpc/grpc-js`), Go (`grpc-go`), and Java (Netty-based) use pure language implementations and never require native compilation.
- Use glibc-based Docker images (Red Hat UBI or Debian). Alpine (musl) may force source compilation for Python/Ruby.
- Source compilation is only triggered on unsupported platforms, very new language versions, or explicit flags like `pip install --no-binary :all:`.

### Python-Specific Performance

- When not using asyncio, Python `ClientBuilder` defaults should enable single-threaded unary streams for improved performance.
- Provide both `build()` (synchronous) and `buildAsync()` (asyncio) variants. The async variant returns a stub using asyncio channels.
- Python and Ruby SDKs use native C-based gRPC core. Pre-built binaries are available for Linux (x86_64, ARM64), macOS, and Windows.

## Database Schema

Kessel Inventory uses a **PostgreSQL** database with GORM as the ORM layer. Migrations are managed by `gormigrate` with timestamp-based IDs (format: `yyyyMMddHHmmss`). Migration source lives in `inventory-api` at `internal/data/migrations/schema/`.

### Tables

The database has **6 tables**:

- **`resource`** -- Root entity containing canonical resource metadata.
- **`reporter_resources`** -- Links resources to specific reporters via a composite natural key. Uses a tombstone flag for soft deletes.
- **`reporter_representations`** -- Versioned reporter-specific view of resource data (JSONB). Tracks version, generation, and tombstone state independently per reporter.
- **`common_representations`** -- Authoritative canonical state for a resource across all reporters. Tracks which reporter most recently supplied the data.
- **`outbox_events`** -- Event sourcing and CDC pattern for external integrations.
- **`metrics_summaries`** -- Aggregated metrics collection with JSONB payload.

### Table Relationships

```
resource (1) --> (n) reporter_resources --> (n) reporter_representations
resource (1) --> (n) common_representations
```

- `reporter_resources.resource_id` is a foreign key to `resource.id`.
- `reporter_representations.reporter_resource_id` is a foreign key to `reporter_resources.id` with CASCADE on UPDATE and DELETE.
- `common_representations.resource_id` is a foreign key to `resource.id`.

### Resource Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `type` | VARCHAR(128) | Resource type, NOT NULL |
| `common_version` | BIGINT | Version of common representation, CHECK >= 0 |
| `ktn` | VARCHAR(1024) | Consistency token |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### Reporter Resources Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `local_resource_id` | VARCHAR(256) | Resource ID in reporter's system, NOT NULL |
| `reporter_type` | VARCHAR(128) | NOT NULL |
| `resource_type` | VARCHAR(128) | NOT NULL |
| `reporter_instance_id` | VARCHAR(256) | NOT NULL |
| `resource_id` | UUID | Foreign key to `resource.id`, NOT NULL |
| `api_href` | VARCHAR(512) | NOT NULL |
| `console_href` | VARCHAR(512) | Nullable |
| `representation_version` | BIGINT | NOT NULL |
| `generation` | BIGINT | NOT NULL |
| `tombstone` | BOOLEAN | Soft delete flag, NOT NULL |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Indexes:**
- `reporter_resource_key_idx` (UNIQUE): `local_resource_id, reporter_type, resource_type, reporter_instance_id, representation_version, generation`
- `reporter_resource_search_idx`: `local_resource_id, reporter_type, resource_type, reporter_instance_id`
- `reporter_resource_resource_id_idx`: `resource_id`
- `idx_reporter_resources_not_tombstone` (partial, WHERE NOT tombstone): `resource_type, reporter_type, reporter_instance_id`

### Reporter Representations Table

| Column | Type | Notes |
|--------|------|-------|
| `reporter_resource_id` | UUID | Primary key, foreign key to `reporter_resources.id` (CASCADE) |
| `version` | BIGINT | Primary key, CHECK >= 0 |
| `generation` | BIGINT | Primary key, CHECK >= 0 |
| `data` | JSONB | Reporter-specific structured data |
| `reporter_version` | VARCHAR(128) | Nullable, version tag from reporter |
| `common_version` | BIGINT | Nullable, CHECK >= 0. Must be NULL when tombstone is true |
| `transaction_id` | VARCHAR(128) | Transaction identifier |
| `tombstone` | BOOLEAN | NOT NULL |
| `created_at` | TIMESTAMP | |

**Indexes:**
- `ux_reporter_reps_txid_nn` (UNIQUE, partial WHERE transaction_id IS NOT NULL AND != ''): `transaction_id`

### Common Representations Table

| Column | Type | Notes |
|--------|------|-------|
| `resource_id` | UUID | Primary key, foreign key to `resource.id` |
| `version` | BIGINT | Primary key, CHECK >= 0 |
| `data` | JSONB | Canonical resource data |
| `reported_by_reporter_type` | VARCHAR(128) | Reporter type that supplied latest data |
| `reported_by_reporter_instance` | VARCHAR(128) | Reporter instance that supplied latest data |
| `transaction_id` | VARCHAR(128) | Transaction identifier |
| `created_at` | TIMESTAMP | |

**Indexes:**
- `ux_common_reps_txid_nn` (UNIQUE, partial WHERE transaction_id IS NOT NULL AND != ''): `transaction_id`

### Outbox Events Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, auto-generated UUIDv7 |
| `aggregatetype` | VARCHAR(255) | `kessel.resources` or `kessel.tuples`, NOT NULL |
| `aggregateid` | VARCHAR(255) | NOT NULL |
| `operation` | VARCHAR(255) | Event operation type (CREATED, UPDATED, DELETED), NOT NULL |
| `txid` | VARCHAR(255) | Transaction ID, nullable |
| `payload` | JSONB | JSON event payload (format varies by aggregate type) |

### Metrics Summary Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `collected_at` | TIMESTAMP | NOT NULL |
| `metrics` | JSONB | NOT NULL |

**Indexes:**
- `idx_metrics_summary_collected_at`: `collected_at`

### Key Design Patterns

- **Tombstone soft deletes**: Rather than deleting rows, `reporter_resources` and `reporter_representations` use a `tombstone` boolean flag.
- **Composite natural keys**: Resources are identified by the composite key `(local_resource_id, reporter_type, resource_type, reporter_instance_id)` on the `reporter_resources` table.
- **JSONB for resource data**: Resource-specific data is stored as JSONB blobs in representation tables, not as normalized columns.
- **Transaction IDs**: Both representation tables carry a `transaction_id` field with a unique partial index (excluding NULL/empty values) for idempotent write support.

## Data Replication Pipeline

### Resource Reporting Patterns

Two reporting methods exist:
- **Synchronous**: API/SDK via `ReportResourceRequest`. The caller must guarantee atomicity, delivery, and ordering.
- **Asynchronous**: Kafka/CDC. The **outbox pattern** with Debezium CDC is recommended for solving the dual-write problem.

### Outbox Pattern

- Two event types are published per resource operation: a **resource event** (`kessel.resources`) and a **tuple event** (`kessel.tuples`).
- `operation` refers to the event operation type: `CREATED`, `UPDATED`, or `DELETED`.
- `payload` format varies by aggregate type: resource events use a CloudEvents v1.0 envelope, tuple events use a plain JSON structure with reporter resource key and version info.

**Event publishing modes** (configured via `outbox-mode`):
- **WAL mode** (`outbox-mode=wal`): The primary and recommended mode. Events are published directly to the PostgreSQL write-ahead log via `pg_logical_emit_message()`, bypassing the outbox table entirely. Debezium captures these messages from the WAL and publishes them to Kafka.
- **Table mode** (`outbox-mode=table`): Deprecated, will be removed. Events are written to and immediately deleted from the outbox table in the same transaction. Debezium captures the row insert from the WAL before the delete takes effect.
- These modes are mutually exclusive.

**Table-mode performance** (applies only when `outbox-mode=table`):
- Prune the outbox table immediately -- delete outbox rows within the same transaction that created them, since Debezium captures the insert from the WAL before the delete takes effect.
- Guard against write skew in concurrent read-modify-write cycles on the outbox table.

**General observability** (both modes):
- Track outbox event creation rate alongside consumption rate to detect end-to-end lag buildup.

### CDC with Debezium

- **Debezium** is the recommended CDC tool.
- CDC reads from the PostgreSQL **write-ahead log (WAL)**, not from polling the outbox table.
- The CDC pipeline is: PostgreSQL WAL -> Debezium connector (Kafka Connect) -> Kafka topic -> Kafka consumer.
- Debezium runs inside a **Kafka Connect cluster** managed by Streams for Apache Kafka (Red Hat's Kafka distribution).
- The Kessel team's consumer is written in **Go** using `confluent-kafka-go` and runs as an **in-process thread**.

### Kafka Event Schema

Kessel Inventory writes two outbox event types per resource operation. After Debezium CDC picks up these events from the PostgreSQL WAL, they are published to Kafka topics with custom headers (`operation` and `version`) added by the Debezium Outbox Event Router transform.

**Resource events** (`kessel.resources`):
- Use a **CloudEvents v1.0** envelope with fields: `specversion`, `type`, `source`, `id`, `subject`, `time`, `datacontenttype`, and `data`.
- Event `type` format: `redhat.inventory.resources.<resource_type>.<operation>` where operation is `created`, `updated`, or `deleted`.
- Event `subject` format: `/resources/<resource_type>/<id>`.
- Event `data` contains three sub-objects: `metadata`, `reporter_data`, and `resource_data`.
- Delete operations currently publish an empty payload for the resource event.

**Tuple events** (`kessel.tuples`):
- Plain JSON structure (not CloudEvents).
- Payload contains: `reporter_resource_key`, `common_version`, and `reporter_representation_version`.
- Tuple events carry a `txid` (transaction ID) for idempotent processing by downstream consumers.

**Downstream consumption:**
- The **Kessel Inventory Consumer** subscribes to Kafka topics and processes Debezium-formatted messages (with `schema` and `payload` wrappers).
- The consumer extracts `operation` and `version` from Kafka message headers to determine how to deserialize and route each message.
- Valid operations from the consumer's perspective are `ReportResource`, `DeleteResource`, and `migration`.
- The consumer calls the Kessel Inventory API via gRPC after deserializing messages into `v1beta2` SDK request types.
- Relationship events are no longer produced. The legacy `resources_relationship` event type has been removed.

### Kafka Consumer Patterns

**Three guarantees** for consumer implementations:
1. **In-order processing** -- messages processed in receive order to prevent update-before-create failures.
2. **At-least-once processing** -- never skip a message; commit only after confirmed processing.
3. **Idempotent processing** -- reprocessing a message must not cause side effects or corruption.

**Retry strategy** (two tiers):
1. **Operation-level retry**: Synchronous, blocking retry with exponential backoff for transient failures within a single message processing operation. Configured via `RetryOptions.OperationMaxRetries`. Uses `time.Sleep(backoff)` to block the processing loop. Setting max retries to `-1` means infinite retries.
2. **Consumer-level retry**: Recreates the entire consumer connection when the consume loop encounters `consumer.ErrClosed`. Configured via `RetryOptions.ConsumerMaxRetries`. Also supports `-1` for infinite retries. Forces re-read from last committed offset.

**Rebalance handling**: Consumer implementations must commit stored offsets in the `RebalanceCallback` when `kafka.RevokedPartitions` is received, before partitions are lost.

**Consumer deployment options**: In-process thread (Kessel team's choice), sidecar container, or standalone pod. In-process has the trade-off of simple deployment but tightly coupled resources (CPU/memory contention).

**Performance patterns:**
- Use **ordered, sequential processing** -- messages must be processed in order within a partition. Do not parallelize within a partition.
- Client statistics use `statistics.interval.ms` for health metrics (rtt, rxmsgs).
- The Kessel team uses `confluent-kafka-go` (Go) and `librdkafka`-based clients.

### LISTEN/NOTIFY for Immediate Visibility

- Use PostgreSQL `LISTEN`/`NOTIFY` to bridge async event processing with synchronous request handling when immediate write visibility is required.
- Flow: request handler writes to outbox + LISTENs on a channel; consumer processes event + NOTIFYs the same channel.
- `LISTEN` must use its own dedicated connection, separate from application logic connections, to avoid blocking.
- Minimize connection creation -- reuse connections for `LISTEN` rather than creating per-request connections.
- Use consistent channel names (not ephemeral) to avoid overhead of frequent channel creation/destruction. Distinguish events by payload identifiers, not channel names.
- Payloads use a UUID to correlate the notification back to the originating request/event.
- Channels are **not durable** -- listening must start before the event is produced.

### Consistency and Failure Patterns

- Reference the dual-write problem when discussing atomicity between database writes and API/event publishing.
- Reference write skew when discussing concurrent modifications.
- The outbox pattern is the recommended solution for atomic event publishing.
- CDC with Debezium is the recommended tool for change data capture.
- LISTEN/NOTIFY provides immediate write visibility over async messaging, but with caveats about durability (notifications are not persistent).

## Monitoring and Observability

### KPIs

- **Message Processing Failure Rate**: ratio of processing errors to total processed messages (consumed + committed, not just consumed)
- **Consumer Error Rate**: rate of Kafka consumer client errors affecting broker interaction
- **Kafka Error Rate**: rate of Kafka broker error events
- **Consumer Lag**: difference between last broker offset and last committed consumer offset
- **End-to-End Lag**: time gap from outbox table write to consumer processing and commit

### Custom Metrics

| Metric | Type | Purpose |
|--------|------|---------|
| Messages Processed | Counter | Track successful event processing |
| Message Process Failures | Counter | Track processing failures |
| Consumer Errors | Counter | Track consumer client failures |
| Kafka Error Events | Counter | Track Kafka broker errors |
| Outbox Event Writes | Counter | Track outbox writes for end-to-end lag |

### Metrics Sources

- **librdkafka internal metrics**: enable via `statistics.interval.ms` (e.g. 60000) on the Kafka consumer client; captures rtt, rxmsgs, and client health
- **Kafka Connect metrics**: Prometheus JMX Exporter on the Debezium connector for CDC health
- **Kafka Lag Exporter**: supplemental offset/lag data from Streams for Apache Kafka
- **Custom application metrics** (Prometheus counters): `messages_processed`, `message_process_failures`, `consumer_errors`, `kafka_error_events`, `outbox_event_writes`

### Alerting

- Alerts must directly align with the KPIs above, plus platform metrics (database disk usage, Kubernetes health).
- Metrics are collected into **Prometheus**, visualized in **Grafana**, alerted via **Alertmanager**.

## Streaming and Pagination

- `listWorkspaces` and `listWorkspacesAsync` use streaming responses with a default pagination limit of 1000 items per page.
- Support `continuationToken` for resuming paginated listings across pages.
- Provide async iterator variants (`listWorkspacesAsync`) for languages that support it (Python, JavaScript).

### Replication Lag Awareness

- Code examples for `Check` requests after `ReportResource` must include a comment noting that replication lag may delay permission visibility: `// NOTE: You may need to wait for replication and caches to update.`
- Do not add artificial delays or retry loops in examples -- just document the caveat.

## Code Example Conventions

- All SDK examples demonstrate the same scenario with identical resource data across languages.
- Async messaging examples (Kafka consumers, outbox pattern) use the Go `confluent-kafka-go` library as the reference implementation.
- SASL authentication with SCRAM-SHA-512 is the standard for Kafka consumers.
