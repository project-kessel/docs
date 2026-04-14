This repository is a **documentation site** (Astro/Starlight) and contains no application code, database connections, migrations, or ORM logic. All database-related content exists as authored documentation guiding service providers on integration patterns with Kessel Inventory. The guidelines below cover how database topics are documented in this repo.

## Repository Context

- The site is built with Astro and the Starlight documentation theme. There is no runtime database.
- Database patterns are described in Markdown/MDX files under `src/content/docs/`, not implemented in code.
- The primary database-related documentation lives in:
  - `src/content/docs/building-with-kessel/how-to/report-resources.mdx` -- Outbox pattern, CDC, Kafka consumer strategies
  - `src/content/docs/building-with-kessel/archive/kessel-inventory.md` -- Inventory DB schema (ER diagram in Mermaid)
  - `src/content/docs/building-with-kessel/archive/kafka-event.md` -- CloudEvents schema for DB change events
  - `src/content/docs/running-kessel/monitoring-kessel/monitoring-data-replication-inventory-api.mdx` -- Monitoring CDC/Outbox KPIs

## Inventory Database Schema Conventions

- Kessel Inventory uses a **SQL database** (PostgreSQL implied by LISTEN/NOTIFY and WAL references).
- Resource-specific data is stored as **JSON blobs** (`json` or `jsonb` columns), not normalized relational columns.
- Primary tables: `resources`, `relationships`, `local_to_inventory_id`.
- Every primary table has a corresponding `_history` table tracking changes with an `operation_type` field (`CREATE`, `UPDATE`, `DELETE`).
- Resources are identified by a composite key from the reporter: `(local_resource_id, resource_type, reporter_id, reporter_type)` -- never by an internal DB ID in external APIs.
- The `local_to_inventory_id` table maps reporter identifiers to internal DB IDs.
- ER diagrams use **Mermaid `erDiagram`** syntax directly in Markdown files.
- Lifecycle diagrams use **Mermaid `flowchart LR`** syntax.

## Outbox Pattern Documentation

When documenting or updating the outbox pattern, follow these conventions:

- The outbox table schema aligns with the **Debezium Outbox Event Router** structure:
  ```sql
  CREATE TABLE outbox (
      id UUID NOT NULL,
      aggregatetype VARCHAR(255) NOT NULL,
      aggregateid VARCHAR(255) NOT NULL,
      version VARCHAR(255) NOT NULL,
      operation VARCHAR(255) NOT NULL,
      payload JSONB,
      PRIMARY KEY (id)
  );
  ```
- `version` refers to the Kessel API version (e.g., `v1beta2`), not an event sequence number.
- `operation` refers to the Kessel API method (e.g., `ReportResource`), not a CRUD verb.
- `payload` must match the `ReportResourceRequest` API call body.
- Outbox writes must be in the **same transaction** as the business entity write.
- Pruning strategy: with Debezium reading from PostgreSQL WAL, rows can be deleted in the **same transaction** that created them.
- If ordering must be preserved beyond WAL, use a **serial primary key** as a secondary ordering mechanism.

## CDC and Debezium Conventions

- **Debezium** is the recommended CDC tool throughout the docs.
- CDC reads from the PostgreSQL **write-ahead log (WAL)**, not from polling the outbox table.
- The CDC pipeline is: PostgreSQL WAL -> Debezium connector (Kafka Connect) -> Kafka topic -> Kafka consumer.
- Debezium runs inside a **Kafka Connect cluster** managed by Streams for Apache Kafka (Red Hat's Kafka distribution).
- The Kessel team's consumer is written in **Go** using `confluent-kafka-go` and runs as an **in-process thread**.

## Kafka Event Schema Conventions

- Events follow the **CloudEvents v1.0** specification.
- Event `type` format for resources: `redhat.inventory.resources.<resource_type>.<operation>` where operation is `created`, `updated`, or `deleted`.
- Event `type` format for relationships: `redhat.inventory.resources_relationship.<relationship_type>.<operation>`.
- Event `subject` format: `/resources/<resource_type>/<id>` or `/resources-relationships/<relationship_type>/<id>`.
- Event `data` contains three sub-objects: `metadata`, `reporter_data`, and either `resource_data` or `relationship_data`.
- The canonical event schema definition lives in the `inventory-api` repo at `data/kafka-event-schema.json`, not in this docs repo.

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
