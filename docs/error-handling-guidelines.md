This repository is a documentation site for Project Kessel built with Astro/Starlight. It contains documentation content (`.md`/`.mdx`), example code in multiple languages (Go, Python, Java, TypeScript, Ruby), and Astro components. The error-handling domain here covers two areas: (1) the error-handling patterns documented and exemplified for Kessel SDK consumers, and (2) the documentation site's own build/config concerns.

---

## Scope

This is a documentation repository (Astro/Starlight), not an application runtime. Error-handling guidelines apply to:
- Example code shipped in `src/examples/` that demonstrates SDK usage to consumers
- Documentation content describing error handling, retry, and monitoring patterns for Kessel integrators
- The documentation site build itself (Astro components, config, TypeScript schemas)

## gRPC Error Handling in Example Code

### Language-specific patterns

Each example in `src/examples/getting-started/` and `src/examples/tls/` should follow the idiomatic error-handling pattern for its language:

- **Go**: Use `status.FromError(err)` to extract gRPC status codes. Switch on `codes.Unavailable`, `codes.PermissionDenied`, etc. Use `log.Fatal` or `log.Fatalf` for unrecoverable errors. Wrap errors with `fmt.Errorf("context: %w", err)`.
- **Python**: Catch `grpc.RpcError` specifically (not generic `Exception`). Log both `e.code()` and `e.details()`.
- **Java**: Catch `io.grpc.StatusRuntimeException`. Do not catch generic `Exception` for gRPC errors.
- **TypeScript/JavaScript**: Use generic `catch (error)` blocks (gRPC-js does not expose a typed error class).
- **Ruby**: Use `rescue => e` blocks and print both the error class and message.

### Do NOT wrap gRPC exceptions

Per the client SDK specification (`src/content/docs/contributing/client-libraries.mdx`):
- Client SDKs SHOULD define their own top-level error type only for errors NOT thrown by gRPC
- gRPC exceptions SHOULD NOT be wrapped by the SDK

### Client-side retry, deadlines, and load balancing

Per the client SDK specification:
- Deadlines, retries, load balancing, and other network-level behavior MUST NOT be specified by client SDK defaults
- These MUST be defined by the server and discovered by the client through [gRPC service config](https://github.com/grpc/proposal/blob/master/A2-service-configs-in-dns.md)
- Exception: HTTP/2 Keepalive MAY be configured on the client since it is not available through service config

### Connection lifecycle errors

- Go examples should use `defer conn.Close()` and handle the close error (log, do not fatal). Note: Some examples like `src/examples/tls/example.go` use `defer conn.Close()` without explicit error handling for brevity.
- Python examples should use `with channel:` context manager for cleanup
- Java examples should call `channel.shutdown()` in a `finally` block

## Kafka Consumer Retry Patterns

When documenting or modifying Kafka consumer retry logic (as in `src/content/docs/building-with-kessel/how-to/report-resources.mdx`):

### Two-tier retry strategy

1. **Operation-level retry**: Synchronous, blocking retry with exponential backoff for transient failures within a single message processing operation. Configured via `RetryOptions.OperationMaxRetries`. Uses `time.Sleep(backoff)` to block the processing loop. Setting max retries to `-1` means infinite retries.

2. **Consumer-level retry**: Recreates the entire consumer connection when the consume loop encounters `consumer.ErrClosed`. Configured via `RetryOptions.ConsumerMaxRetries`. Also supports `-1` for infinite retries. Forces re-read from last committed offset.

### Data integrity guarantees to document

Any consumer documentation MUST reference these three guarantees:
- Messages processed in order
- At-least-once processing (never skip/lose a message)
- Idempotent processing (reprocessing produces the same outcome)

### Rebalance error handling

Consumer implementations must commit stored offsets in the `RebalanceCallback` when `kafka.RevokedPartitions` is received, before partitions are lost.

## Monitoring and Error Metrics

When documenting monitoring (as in `src/content/docs/running-kessel/monitoring-kessel/monitoring-data-replication-inventory-api.mdx`), reference these custom metrics:

| Metric | Type | Purpose |
|--------|------|---------|
| Messages Processed | Counter | Track successful event processing |
| Message Process Failures | Counter | Track processing failures |
| Consumer Errors | Counter | Track consumer client failures |
| Kafka Error Events | Counter | Track Kafka broker errors |
| Outbox Event Writes | Counter | Track outbox writes for end-to-end lag |

KPIs to document: Message Processing Failure Rate, Consumer Error Rate, Kafka Error Rate, Consumer Lag, End-to-End Lag.

## Authentication Error Handling

- OAuth2 token management includes automatic retry on authentication failures (documented in `src/content/docs/building-with-kessel/how-to/authenticate-with-python-sdk.mdx`)
- `OAuth2ClientCredentials.getToken()` caches tokens and refreshes when expiry is within 300 seconds
- `forceRefresh` parameter exists but is documented as "NOT RECOMMENDED"
- Implementations of `getToken()` must be thread-safe

## TLS Configuration Errors

Go TLS examples should return descriptive wrapped errors:
```go
return nil, fmt.Errorf("failed to read the ca cert file: %w", err)
return nil, fmt.Errorf("failed to add server CA certificate")
```

Python TLS examples should let file I/O errors propagate naturally (no explicit catch needed for cert loading), but gRPC call errors after TLS setup should catch `grpc.RpcError`.

## Documentation Site Errors

### Astro/TypeScript

- Zod schemas in `src/schemas/client-package.ts` use `.optional().default(false)` for boolean fields -- maintain this pattern for new schema fields
- The `src/middleware/client-package-toc.ts` middleware augments heading generation; errors here surface as build failures, not runtime errors

### Example code regions

All example files use region markers (`//#region`, `//endregion`, `# region`, `# endregion`) to enable selective inclusion in documentation via `import.meta.glob`. Error handling code MUST be inside the appropriate region so it is included when the documentation renders the example.

## Consistency and Failure Patterns in Documentation

When writing documentation about data replication:
- Reference the dual-write problem when discussing atomicity between database writes and API/event publishing
- Reference write skew when discussing concurrent modifications
- The outbox pattern is the recommended solution for atomic event publishing
- CDC with Debezium is the recommended tool for change data capture
- LISTEN/NOTIFY is documented as a pattern for immediate write visibility over async messaging, but with caveats about durability (notifications are not persistent)
