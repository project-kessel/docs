# Code Examples Authoring Guidelines

These rules supplement [AGENTS.md](../../AGENTS.md) for files under `src/examples/`. For Kessel platform domain knowledge (API contracts, auth, gRPC patterns, error codes), see [KESSEL-INTEGRATION-GUIDE.md](../../KESSEL-INTEGRATION-GUIDE.md).

## File Organization

- Examples are organized by topic in subdirectories (e.g., `auth/`, `inventory/`, `relations/`).
- File names reflect the operation or concept demonstrated, not the language.
- Each topic directory should have examples in at minimum **Go** and **Python**. Add TypeScript, Java, and Ruby where relevant.

## Region Markers

Use region markers for selective inclusion via the `CodeExamples` component:

- **C-style languages** (Go, TypeScript, Java): `//#region name` and `//#endregion`
- **Hash-style languages** (Python, Ruby, Bash): `# region name` and `# endregion`

All important code — including error handling, cleanup, and connection setup — must be inside regions. Code outside regions is invisible to the documentation site.

## CodeExamples Component Integration

- The `CodeExamples` Astro component renders tabbed, multi-language code blocks from example files.
- Region names must be consistent across language variants of the same example.
- Test that region extraction works by running `npm run dev` and checking the rendered output.

## gRPC Error Handling by Language

Each language has its own idiomatic error-handling pattern. Examples must follow these conventions:

- **Go**: `status.FromError(err)` → switch on `codes.*`. Use `log.Fatal` for unrecoverable errors.
- **Python**: Catch `grpc.RpcError` specifically, not generic `Exception`. Log `e.code()` and `e.details()`.
- **Java**: Catch `io.grpc.StatusRuntimeException`, not generic `Exception`.
- **TypeScript/JavaScript**: Generic `catch (error)` blocks (gRPC-js has no typed error class).
- **Ruby**: `rescue => e` with class and message logging.

Do NOT wrap gRPC exceptions in SDK-specific error types.

## Connection Lifecycle

- **Go**: `defer conn.Close()` — handle the close error (log, do not fatal).
- **Python**: `with channel:` context manager for cleanup.
- **Java**: `channel.shutdown()` in a `finally` block.

## Replication Lag Convention

Examples showing `Check` requests after `ReportResource` must include a language-appropriate note:
- C-style examples (Go, TS, Java): `// NOTE: You may need to wait for replication and caches to update.`
- Hash-style examples (Python, Ruby, Bash): `# NOTE: You may need to wait for replication and caches to update.`

Do not add artificial delays or retry loops — just document the caveat.

## Async Messaging Examples

- Kafka consumer examples use Go with `confluent-kafka-go` as the reference implementation.
- SASL authentication examples use SCRAM-SHA-512 mechanism.
- All SDK examples demonstrate the same scenario with identical resource data across languages.
