This repository is a **documentation site** (Astro/Starlight) and contains no application code, database connections, migrations, or ORM logic. All database-related content exists as authored documentation guiding service providers on integration patterns with Kessel Inventory. The guidelines below cover how database topics are documented in this repo.

## Repository Context

- The site is built with Astro and the Starlight documentation theme. There is no runtime database.
- Database patterns are described in Markdown/MDX files under `src/content/docs/`, not implemented in code.
- The primary database-related documentation lives in:
  - `src/content/docs/building-with-kessel/how-to/report-resources.mdx` -- Outbox pattern, CDC, Kafka consumer strategies
  - `src/content/docs/running-kessel/monitoring-kessel/monitoring-data-replication-inventory-api.mdx` -- Monitoring CDC/Outbox KPIs

## Inventory Database Schema

Kessel Inventory uses a **PostgreSQL** database with GORM as the ORM layer. Migrations are managed by `gormigrate` with timestamp-based IDs (format: `yyyyMMddHHmmss`). Migration source lives in `inventory-api` at `internal/data/migrations/schema/`.

### Current Tables

The database has **6 tables**:

- **`resource`** -- Root entity containing canonical resource metadata.
- **`reporter_resources`** -- Links resources to specific reporters via a composite natural key. Uses a tombstone flag for soft deletes.
- **`reporter_representations`** -- Versioned reporter-specific view of resource data (JSONB). Tracks version, generation, and tombstone state independently per reporter.
- **`common_representations`** -- Authoritative canonical state for a resource across all reporters. Tracks which reporter most recently supplied the data.
- **`outbox_events`** -- Event sourcing and CDC pattern for external integrations.
- **`metrics_summary`** -- Aggregated metrics collection with JSONB payload.

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

**Dual mode support:**
- **Table mode** (`outbox-mode=table`): Events written to and immediately deleted from the table in the same transaction.
- **WAL mode** (`outbox-mode=wal`): Events published via PostgreSQL logical decoding with `pg_logical_emit_message()`.

### Metrics Summary Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `collected_at` | TIMESTAMP | NOT NULL |
| `metrics` | JSONB | NOT NULL |

**Indexes:**
- `idx_metrics_summary_collected_at`: `collected_at`

### Key Design Patterns

- **No history tables**: The legacy `_history` tables (`resource_history`, `relationship_history`) and the `local_to_inventory_id` mapping table have been removed. History is now captured via immutable, versioned representation records (`reporter_representations` and `common_representations`) with version and generation counters.
- **No relationships table**: Relationships between resources are no longer stored as separate database entities in the inventory schema.
- **Tombstone soft deletes**: Rather than deleting rows, `reporter_resources` and `reporter_representations` use a `tombstone` boolean flag.
- **Composite natural keys**: Resources are identified by the composite key `(local_resource_id, reporter_type, resource_type, reporter_instance_id)` on the `reporter_resources` table, replacing the old `local_to_inventory_id` mapping.
- **JSONB for resource data**: Resource-specific data is stored as JSONB blobs in representation tables, not as normalized columns.
- **Transaction IDs**: Both representation tables carry a `transaction_id` field with a unique partial index (excluding NULL/empty values) for idempotent write support.

## Outbox Pattern Documentation

When documenting or updating the outbox pattern, follow these conventions:

- Two event types are published per resource operation: a **resource event** (`kessel.resources`) and a **tuple event** (`kessel.tuples`).
- `operation` refers to the event operation type: `CREATED`, `UPDATED`, or `DELETED`.
- `payload` format varies by aggregate type: resource events use a CloudEvents v1.0 envelope, tuple events use a plain JSON structure with reporter resource key and version info.
- Outbox writes must be in the **same transaction** as the business entity write.
- Pruning strategy: with Debezium reading from PostgreSQL WAL, rows can be deleted in the **same transaction** that created them (table mode).
- WAL mode bypasses the table entirely using PostgreSQL logical decoding.

## CDC and Debezium Conventions

- **Debezium** is the recommended CDC tool throughout the docs.
- CDC reads from the PostgreSQL **write-ahead log (WAL)**, not from polling the outbox table.
- The CDC pipeline is: PostgreSQL WAL -> Debezium connector (Kafka Connect) -> Kafka topic -> Kafka consumer.
- Debezium runs inside a **Kafka Connect cluster** managed by Streams for Apache Kafka (Red Hat's Kafka distribution).
- The Kessel team's consumer is written in **Go** using `confluent-kafka-go` and runs as an **in-process thread**.

## Kafka Event Schema Conventions

Kessel Inventory writes two outbox event types per resource operation. After Debezium CDC picks up these events from the PostgreSQL WAL, they are published to Kafka topics with custom headers (`operation` and `version`) added by the Debezium Outbox Event Router transform.

### Resource events (`kessel.resources`)

- Resource events for create and update operations use a **CloudEvents v1.0** envelope with fields: `specversion`, `type`, `source`, `id`, `subject`, `time`, `datacontenttype`, and `data`.
- Event `type` format: `redhat.inventory.resources.<resource_type>.<operation>` where operation is `created`, `updated`, or `deleted`.
- Event `subject` format: `/resources/<resource_type>/<id>`.
- Event `data` contains three sub-objects: `metadata`, `reporter_data`, and `resource_data`.
- Delete operations currently publish an empty payload for the resource event.

### Tuple events (`kessel.tuples`)

- Tuple events use a plain JSON structure (not CloudEvents).
- Payload contains: `reporter_resource_key` (composite key identifying the resource-reporter binding), `common_version`, and `reporter_representation_version`.
- Tuple events carry a `txid` (transaction ID) for idempotent processing by downstream consumers.

### Downstream consumption

- The **Kessel Inventory Consumer** subscribes to Kafka topics and processes Debezium-formatted messages (with `schema` and `payload` wrappers).
- The consumer extracts `operation` and `version` from Kafka message headers to determine how to deserialize and route each message.
- Valid operations from the consumer's perspective are `ReportResource`, `DeleteResource`, and `migration`.
- The consumer calls the Kessel Inventory API via gRPC (`ReportResource` / `DeleteResource`) after deserializing messages into `v1beta2` SDK request types.

## Monitoring and Alerting Conventions

When documenting monitoring for database/replication flows:

- Five custom metrics must be tracked: Messages Processed, Message Process Failures, Consumer Errors, Kafka Error Events, Outbox Event Writes.
- KPIs derived from these: Message Processing Failure Rate, Consumer Error Rate, Kafka Error Rate, Consumer Lag, End-to-End Lag.
- End-to-End Lag = time from outbox table write to consumer commit (not just Kafka consumer lag).
- Metrics are collected into **Prometheus**, visualized in **Grafana**, alerted via **Alertmanager**.
- Three metrics sources: librdkafka internal stats (via `statistics.interval.ms`), Streams for Apache Kafka JMX exporter, Kafka Lag Exporter.
- Alerting must cover both data-plane KPIs and platform metrics (DB disk usage, Kubernetes health).

## Kafka Consumer Guarantees

Documentation for consumer implementations must emphasize three guarantees:

1. **In-order processing** -- messages processed in receive order to prevent update-before-create failures.
2. **At-least-once processing** -- never skip a message; commit only after confirmed processing.
3. **Idempotent processing** -- reprocessing a message must not cause side effects or corruption.

- Consumer authentication uses **SASL with SCRAM-SHA-512**.
- Two retry tiers: operation-level retry (exponential backoff, blocks main loop) and consumer-level retry (recreates entire consumer connection from last committed offset).
- Rebalance handling: register a `RebalanceCallback` that commits stored offsets before partitions are revoked.

## Postgres LISTEN/NOTIFY Pattern

- Used for **immediate write visibility** over async messaging when synchronous confirmation is needed.
- Flow: request handler writes to outbox + LISTENs on a channel; consumer processes event + NOTIFYs the same channel.
- Channel names are stable strings (e.g., `host-replication`), not ephemeral per-request channels.
- LISTEN/NOTIFY must use a **dedicated pg connection**, separate from application logic connections.
- Payloads use a UUID to correlate the notification back to the originating request/event.
- Document that channels are **not durable** -- listening must start before the event is produced.

## Documentation Authoring Rules

- SQL examples use PostgreSQL syntax exclusively.
- Code examples for consumer logic use **Go** (matching the Kessel team's implementation).
- Database diagrams use **Mermaid** syntax embedded directly in `.md`/`.mdx` files.
- Archived documentation lives in `src/content/docs/building-with-kessel/archive/` and should not be treated as current guidance.
- Cross-references to internal Red Hat guides must note the VPN requirement.
