This repository is a **documentation site** (Astro + Starlight) for Project Kessel. It does not contain application code with runtime integrations. Instead, it documents the integration patterns, protocols, and conventions that service providers must follow when integrating with Kessel. The guidelines below cover the documented integration patterns, how they are represented in this repo, and the conventions for writing integration-related documentation.

## Kessel Integration Architecture

- Kessel consists of two core services: **Inventory API** (resource storage and reporting) and **Relations API + SpiceDB** (relationship-based access control). The Relations API is planned to merge into Inventory.
- The primary protocol is **gRPC** with protobuf. HTTP REST is supported but secondary and may lack features like streaming.
- API definitions live in external repos and are referenced here. The gRPC spec is on [Buf Schema Registry](https://buf.build/project-kessel/inventory-api), and the OpenAPI spec is pulled from `project-kessel/inventory-api` at build time (see `astro.config.mjs` `starlightOpenAPI` plugin).
- The current API version is **v1beta2**. References to v1beta1 are deprecated and belong under `archive/`.

## Resource Reporting Patterns

When documenting resource reporting, follow these established patterns:

- **Two reporting methods exist**: synchronous (API/SDK) and asynchronous (Kafka/CDC). Document trade-offs, not just mechanics.
- Synchronous reporting uses `ReportResourceRequest` via gRPC or SDK. The caller must guarantee atomicity, delivery, and ordering.
- Async reporting uses Kafka topics owned by Kessel. Document the **outbox pattern** with Debezium CDC as the recommended approach for solving the dual-write problem.
- The outbox table (`outbox_events`) uses columns: `id` (UUID), `aggregatetype` (`kessel.resources` or `kessel.tuples`), `aggregateid`, `operation` (event operation: `CREATED`, `UPDATED`, `DELETED`), `txid` (transaction ID, nullable), `payload` (JSONB, format varies by aggregate type).
- **Postgres LISTEN/NOTIFY** is documented as a pattern for achieving immediate write visibility over async pipelines. Document that it requires its own connection, uses stable channel names, and payloads must include identifiers for listener filtering.

## Kafka Event Schema

Kessel Inventory writes two outbox event types per resource operation, which are published to Kafka via Debezium CDC:

- **Resource events** (`kessel.resources`): Create and update operations use a CloudEvents v1.0 envelope with `specversion`, `type`, `source`, `id`, `subject`, `time`, `datacontenttype`, and `data` fields. The `data` payload contains `metadata`, `reporter_data`, and `resource_data`. Delete operations currently publish an empty payload. Event `type` format: `redhat.inventory.resources.{resource_type}.{operation}`.
- **Tuple events** (`kessel.tuples`): Plain JSON containing `reporter_resource_key`, `common_version`, and `reporter_representation_version`. Used for downstream relationship/tuple synchronization.
- Debezium's Outbox Event Router adds `operation` and `version` headers to each Kafka message.
- The **Kessel Inventory Consumer** subscribes to these topics, deserializes Debezium-formatted messages, and calls the Inventory API via gRPC (`ReportResource` / `DeleteResource`) using `v1beta2` SDK types.
- Relationship events are no longer produced. The legacy `resources_relationship` event type and `relationship_data` payload structure have been removed.

## Kafka Consumer Conventions

- Document these three guarantees for consumer implementations: in-order processing, at-least-once delivery, and idempotent processing.
- Kafka authentication uses **SASL with SCRAM-SHA-512**.
- Retry logic uses two tiers: operation-level retry (exponential backoff with `time.Sleep`) and consumer-level retry (full consumer recreation on `ErrClosed`).
- Rebalance handling must commit stored offsets before partition revocation via a `RebalanceCallback`.
- Consumer deployment options: in-process thread (Kessel team's choice), sidecar container, or standalone pod.
- Client statistics use `statistics.interval.ms` for health metrics (rtt, rxmsgs).
- The Kessel team uses `confluent-kafka-go` (Go) and `librdkafka`-based clients.

## SDK Integration Documentation

- SDKs exist for **Go**, **Python**, **TypeScript/JavaScript**, **Ruby**, and **Java**. Repos follow naming `kessel-sdk-{lang}`.
- SDK import hierarchy: `{prefix}.inventory.v1beta2` for service-specific code, `{prefix}.grpc` for gRPC utilities, `{prefix}.auth` for authentication, `{prefix}.middleware` for transport-agnostic utilities.
- The `ClientBuilder` pattern is the canonical way to construct clients. Document the builder chain: `ClientBuilder(target).insecure().build()` for dev, `.oauth2ClientAuthenticated(credentials).build()` for prod.
- `build()` returns a tuple `(Stub, Closeable)` when the stub lacks a `close()` method (Python, Go). In Go: `inventoryClient, conn, err := v1beta2.NewClientBuilder(target).Insecure().Build()`.
- Authentication uses `OAuth2ClientCredentials` with OIDC discovery or direct token URL. Tokens are cached and auto-refreshed.
- Code examples are in `src/examples/` organized by topic (e.g. `getting-started/`, `tls/`). They use `#region` / `#endregion` markers for selective rendering via `CodeExamples.astro`.

## Monitoring and Observability

For data replication and consistency monitoring patterns (KPIs, metrics sources, custom metrics), see the [Data Replication and Consistency Monitoring](performance-guidelines.md#data-replication-and-consistency-monitoring) section in performance-guidelines.md.

## Documentation Conventions for Integration Content

- Place current integration docs under `src/content/docs/building-with-kessel/how-to/` or `concepts/`.
- Place deprecated API docs (v1beta1) under `archive/` with a deprecation notice at the top.
- Use `.mdx` extension for docs that need Astro components (Aside, Tabs, Code, LinkCard). Use `.md` for pure markdown.
- Frontmatter `sidebar.order` controls navigation ordering within sections. Lower numbers appear first.
- Code examples across multiple languages use `CodeExamples.astro` with glob imports: `import.meta.glob('/src/examples/{topic}/example.*', { query: '?raw', eager: true, import: 'default' })`.
- Region markers in examples: Go uses `//#region name` and `//#endregion`, Python and Ruby use `# region name` and `# endregion`.
- When documenting SDK patterns, show examples in at least Go and Python, as these are the most complete reference implementations.
- Link to Buf Schema Registry for protobuf types rather than duplicating message definitions: `https://buf.build/project-kessel/inventory-api/docs/main:kessel.inventory.v1beta2`.
- External references to inventory-api OpenAPI schema are configured in `astro.config.mjs` and auto-generate sidebar entries.
