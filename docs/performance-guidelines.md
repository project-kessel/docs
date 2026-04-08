## OAuth2 Token Caching

- `OAuth2ClientCredentials.getToken()` must cache tokens and return the cached token when it does not expire within the next 5 minutes (300 seconds). Only fetch a new token when the cached one is within this expiry window.
- `getToken()` implementations must be thread-safe across all languages.
- The `forceRefresh` parameter bypasses the cache. Document it as "NOT RECOMMENDED" and label it with caution in all SDK implementations.
- Token fetching is lazy -- no network calls until the first `getToken()` invocation. Document this as "Lazy Initialization" in feature lists.

## gRPC Channel and Stub Reuse

- Library documentation and abstractions must guide users to reuse gRPC Channels and Stubs, per [gRPC performance best practices](https://grpc.io/docs/guides/performance/).
- The `ClientBuilder` may offer a `cacheKey` parameter: if provided, it either creates a new channel/stub or retrieves a cached one using the same key value. Same key assumes same configuration.
- Channel/stub lifecycle should be managed by the application (e.g. through DI containers). SDK code must not manage global lifecycle silently.
- `build()` must return a tuple `(Stub, Closeable)` when the stub lacks a `close()` method, ensuring explicit resource cleanup to prevent connection leaks.

## Network Defaults and Service Config

- Deadlines, retries, load balancing, and other network-level behavior must NOT be specified by client defaults. These must be defined by the server and discovered by the client through [gRPC service config](https://github.com/grpc/proposal/blob/master/A2-service-configs-in-dns.md).
- HTTP/2 Keepalive is an exception -- it requires explicit client-side channel configuration and is not available through service config. The `ClientBuilder` default configuration does NOT include keep alive.
- The `dns://` URI scheme triggers DNS-based name resolution and service configuration discovery from TXT records. Omitting a scheme defaults to `dns`.

## Python-Specific Performance

- When not using asyncio, Python `ClientBuilder` defaults should enable single-threaded unary streams for improved performance.
- Provide both `build()` (synchronous) and `buildAsync()` (asyncio) variants. The async variant returns a stub using asyncio channels.
- Python and Ruby SDKs use native C-based gRPC core. Pre-built binaries are available for Linux (x86_64, ARM64), macOS, and Windows -- installation times are unaffected in normal circumstances.

## gRPC Compilation in CI/CD

- When compiling gRPC from source (Python/Ruby only), limit parallel compilation to prevent CI timeouts caused by double parallelism (package manager + C compiler):
  - Python: set `GRPC_PYTHON_BUILD_EXT_COMPILER_JOBS=4`
  - Ruby: set `GRPC_RUBY_BUILD_PROCS=4`, `MAKEFLAGS="-j4"`, and `BUNDLE_JOBS=4`
- Node.js (`@grpc/grpc-js`), Go (`grpc-go`), and Java (Netty-based) use pure language implementations and never require native compilation.
- Use glibc-based Docker images (Red Hat UBI or Debian). Alpine (musl) may force source compilation for Python/Ruby.
- Source compilation is only triggered on unsupported platforms, very new language versions, or explicit flags like `pip install --no-binary :all:`.

## Data Replication and Consistency Monitoring

When documenting data replication patterns (CDC/Outbox), the following KPIs and metrics must be covered:

### Required KPIs
- **Message Processing Failure Rate**: ratio of processing errors to total processed messages (consumed + committed, not just consumed)
- **Consumer Error Rate**: rate of Kafka consumer client errors affecting broker interaction
- **Kafka Error Rate**: rate of Kafka broker error events
- **Consumer Lag**: difference between last broker offset and last committed consumer offset
- **End-to-End Lag**: time gap from outbox table write to consumer processing and commit

### Required Metrics Sources
- **librdkafka internal metrics**: enable via `statistics.interval.ms` (e.g. 60000) on the Kafka consumer client; captures rtt, rxmsgs, and client health
- **Kafka Connect metrics**: Prometheus JMX Exporter on the Debezium connector for CDC health
- **Kafka Lag Exporter**: supplemental offset/lag data from Streams for Apache Kafka
- **Custom application metrics** (Prometheus counters): `messages_processed`, `message_process_failures`, `consumer_errors`, `kafka_error_events`, `outbox_event_writes`

### Alerting
- Alerts must directly align with the KPIs above, plus platform metrics (database disk usage, Kubernetes health).

## Kafka Consumer Performance Patterns

- Use **ordered, sequential processing** -- messages must be processed in order within a partition. Do not parallelize message processing within a single partition.
- Use **operation-level retry with exponential backoff** (`time.Sleep` blocking) for transient failures. This intentionally blocks the consumer loop to preserve ordering.
- Use **consumer-level retry** (recreate the entire consumer connection) for unrecoverable consumer errors (`ErrClosed`), forcing re-read from last committed offset.
- Register a `RebalanceCallback` to commit stored offsets before partitions are revoked, preventing duplicate processing on rebalance.
- Kessel runs the consumer as an **in-process thread** within the main application. Document the trade-off: simple deployment but tightly coupled resources (CPU/memory contention). Alternatives are sidecar container or standalone pod.

## Outbox Table Performance

- Prune the outbox table immediately -- with Debezium reading from the write-ahead log, delete outbox rows within the same transaction that created them.
- Track outbox event creation rate alongside consumption rate to detect end-to-end lag buildup.
- Guard against write skew in concurrent read-modify-write cycles on the outbox table.

## Immediate Visibility with Async Messaging

- Use PostgreSQL `LISTEN`/`NOTIFY` to bridge async event processing with synchronous request handling when immediate write visibility is required.
- `LISTEN` must use its own dedicated connection, separate from application logic connections, to avoid blocking.
- Minimize connection creation -- reuse connections for `LISTEN` rather than creating per-request connections.
- Use consistent channel names (not ephemeral) to avoid overhead of frequent channel creation/destruction. Distinguish events by payload identifiers, not channel names.

## Streaming and Pagination

- `listWorkspaces` and `listWorkspacesAsync` use streaming responses with a default pagination limit of 1000 items per page.
- Support `continuationToken` for resuming paginated listings across pages.
- Provide async iterator variants (`listWorkspacesAsync`) for languages that support it (Python, JavaScript).

## Replication Lag Awareness in Examples

- Code examples for `Check` requests after `ReportResource` must include a comment noting that replication lag may delay permission visibility: `// NOTE: You may need to wait for replication and caches to update.`
- Do not add artificial delays or retry loops in examples -- just document the caveat.
