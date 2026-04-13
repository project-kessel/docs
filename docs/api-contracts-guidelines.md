## Repository Purpose

This is the Kessel documentation site (Astro/Starlight). It documents API contracts for the Kessel platform -- a multi-tenant resource management and access control system. Content covers gRPC/REST APIs, SDK specifications, CloudEvents schemas, and schema languages (KSL/SpiceDB).

## API Versioning

- **Inventory API** uses **v1beta2** as the current version. The v1beta1 API is deprecated and archived.
- **Relations API** uses **v1beta1** for all protos.
- API paths follow the pattern `/api/kessel/{api-version}/...` (e.g., `/api/kessel/v1beta2/resources` for inventory).
- gRPC service names use the pattern `kessel.{service}.{version}.{ServiceName}`:
  - Inventory: `kessel.inventory.v1beta2.KesselInventoryService`
  - Relations: `kessel.relations.v1beta1.KesselTupleService`
- Protobuf definitions are hosted on the Buf Schema Registry at `buf.build/project-kessel/inventory-api` and `buf.build/project-kessel/relations-api`.
- The OpenAPI spec is pulled from `https://raw.githubusercontent.com/project-kessel/inventory-api/refs/heads/main/openapi.yaml`.

## SDK Client Library Conventions

- SDKs are scoped to **Kessel as a whole**, not individual services. Import prefixes include "kessel" (e.g., `kessel.inventory.v1beta2`, `@project-kessel/kessel-sdk`).
- Import hierarchy follows the pattern `{prefix}.{service}.{major_version}` and is consistent across languages:
  - `{prefix}.auth` -- generic authentication abstractions
  - `{prefix}.grpc` -- gRPC-specific utilities (must not import peer packages)
  - `{prefix}.http` -- HTTP-specific utilities (must not import peer packages)
  - `{prefix}.middleware` -- transport-agnostic middleware
  - `{prefix}.{service}.{major_version}` -- version-specific generated code and utilities
- Case conventions follow each language's idioms (e.g., `snake_case` in Python, `camelCase` in JS/TS) but the specification uses JavaScript conventions as canonical.
- Client stubs are generated from API specifications using `buf` for gRPC and `openapi-generator` for HTTP. Generation is reproducible with pinned plugin versions.

## ClientBuilder Pattern

Every `{service}.{major_version}` package exposes a `ClientBuilder` class:

- Constructor takes a `target` URI string (gRPC endpoint).
- Authentication methods: `oauth2ClientAuthenticated(credentials)`, `authenticated(callCredentials, channelCredentials)`, `unauthenticated(channelCredentials)`, `insecure()`.
- `build()` returns the stub (and channel if the stub lacks `close()`). `buildAsync()` is required for Python and JavaScript.
- Default behavior: TLS with runtime default trust bundle. No deadlines, retries, or load balancing -- these come from gRPC service config.
- Insecure mode is only for local development/testing.

## ReportResource Request Structure (v1beta2)

The `ReportResourceRequest` protobuf message requires:
- `type` -- resource type string (e.g., `"document"`)
- `reporter_type` -- reporter identifier (e.g., `"drive"`)
- `reporter_instance_id` -- unique reporter instance
- `representations` containing:
  - `metadata` (`RepresentationMetadata`): `local_resource_id`, `api_href`, `console_href`, `reporter_version`
  - `common` (`google.protobuf.Struct`): shared attributes across reporters (e.g., `workspace_id`)
  - `reporter` (`google.protobuf.Struct`): reporter-specific attributes

## Check Request Structure (v1beta2)

The `CheckRequest` requires:
- `object` (`ResourceReference`): `resource_type`, `resource_id`, `reporter` (`ReporterReference` with `type`)
- `relation` -- permission to check (e.g., `"view"`)
- `subject` (`SubjectReference`): contains a `resource` (`ResourceReference`) identifying the subject

Principals use `resource_type: "principal"` with `reporter.type: "rbac"`.

## CloudEvents Schema

Events follow CloudEvents 1.0 with these Kessel conventions:
- `type`: `redhat.inventory.resources.{resource_type}.{operation}` where operation is `created`, `updated`, or `deleted`
- `type` for relationships: `redhat.inventory.resources-relationship.{relationship_type}.{operation}`
- `subject`: `/resources/{resource_type}/{id}` or `/resources-relationships/{relationship_type}/{id}`
- `source`: the inventory API URI
- `datacontenttype`: always `"application/json"`
- `data` payload contains `metadata`, `reporter_data`, and `resource_data` (or `relationship_data`)

## Resource Schema Configuration

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

## Permission Schema (KSL)

- Permissions are defined in `.ksl` files using the KSL schema language (version 0.1).
- Built-in schemas (`kessel.ksl`, `rbac.ksl`) are present in examples. Custom schemas import `rbac` and use extensions.
- Permissions are added via `@rbac.add_permission(name:'permission_name')` annotations.
- Resource types declare `relation workspace: [ExactlyOne rbac.workspace]` and derive permissions from workspace-level grants: `relation view: workspace.view_document`.
- KSL compiles to SpiceDB `.zed` schema via the `ksl` compiler.

## Relations API (Tuples)

- Roles are created by writing tuples to `kessel.relations.v1beta1.KesselTupleService.CreateTuples`.
- Resource/subject references use `type.name` + `type.namespace` (e.g., `name: "role", namespace: "rbac"`).
- Role bindings require three tuples in a single `CreateTuples` call: binding->granted->role, binding->subject->principal, workspace->user_grant->binding.
- Binding IDs follow the deterministic pattern `{role}--{user}--{resource}`.

## Code Example and Documentation Conventions

For SDK package documentation patterns, code example structure, and region markers, see the [Code Examples](../AGENTS.md#code-examples) and [Client Package Documentation System](../AGENTS.md#client-package-documentation-system) sections in AGENTS.md.

Additional API-specific conventions:
- Async messaging examples (Kafka consumers, outbox pattern) use the Go `confluent-kafka-go` library as the reference implementation.
- SASL authentication with SCRAM-SHA-512 is the standard for Kafka consumers.

## Dependency Rules

- SDKs do not depend on server code, and servers do not depend on SDKs.
- Protocol dependencies (gRPC/protobuf) may be transitive. Non-protocol dependencies (e.g., OAuth libraries) should be optional unless the package is explicitly branded for that integration.
- Exception: google-auth-* libraries for gRPC authentication should be included transitively.
