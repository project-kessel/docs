---
title: "Package: middleware"
docType: client-package
---

Package for framework-agnostic helpers that integrate Kessel's API surface into a request lifecycle. Unlike the [`grpc`](./grpc.md) package, helpers here are not transport-specific. They cover the full range of Kessel operations that typically sit inside request handling:

- **Authorization** — wrapping `Check`, `CheckSelf`, `CheckForUpdate`, and their bulk variants
- **Resource lifecycle** — calling `ReportResource` on create/update and `DeleteResource` on delete
- **Relationship queries** — consuming `StreamedListObjects` and `StreamedListSubjects` for filtered list endpoints
- etc.

## API version coupling

Middleware helpers are internally coupled to a specific API version (e.g. `v1beta2`), but their public interfaces abstract away the underlying protobuf and transport details. API version bumps are an implementation concern, not part of the package's public contract.

## Framework integrations

Framework-specific middleware (Flask decorators, Express middleware, Spring servlet filters, etc.) **MUST NOT** be bundled into the main SDK. Web framework dependencies are inappropriate to impose on all SDK users.

Framework integrations belong in:
- A separate optional package (e.g. `kessel-sdk-flask`), or
- Application code following the patterns in the [protect an endpoint guide](/docs/building-with-kessel/how-to/protect-endpoint/)

If a framework integration is contributed as a sub-module, follow the naming convention `middleware.{integration}` (e.g. `middleware.django`, `middleware.spring`) and treat its framework dependency as optional.

## Current state

No standardized API surface is required for this package yet. SDK authors may provide framework-agnostic check helpers as a convenience, but this is not currently specified. The [protect-endpoint guide](/docs/building-with-kessel/how-to/protect-endpoint/) provides reference implementations in all supported languages.
