---
title: Docs Content Authoring Guidelines
description: Authoring rules for documentation pages under src/content/docs/
sidebar:
  hidden: true
---

These rules supplement [AGENTS.md](../../../AGENTS.md) for files under `src/content/docs/`. For Kessel platform domain knowledge (API contracts, auth, SDKs, database schema, CDC/Kafka), see [KESSEL-INTEGRATION-GUIDE.md](../../../KESSEL-INTEGRATION-GUIDE.md).

## File Format

- Use `.mdx` for pages that import Astro components (`Aside`, `Tabs`, `CodeExamples`, etc.).
- Use `.md` for pure Markdown content with no component imports.
- All frontmatter must include at minimum: `title` and `description`.
- Boolean frontmatter fields use Zod `.optional().default(false)` — maintain this pattern.

## Content Placement

- `getting-started/` — Tutorials and quickstarts (Diataxis: tutorial)
- `building-with-kessel/` — How-to guides for integrators (Diataxis: how-to)
- `concepts/` — Explanations of architecture and design (Diataxis: explanation)
- `reference/` — API references, schemas, config (Diataxis: reference)
- `archive/` — Deprecated v1beta1 content; do not add new content here
- Know which Diataxis type you are writing — do not mix tutorials with references.

## Security in Documentation

- Never include real credentials. Use placeholders: `"your-client-id"`, `<PASSWORD>`, `<TOKEN>`.
- Mark `insecure()` / `Insecure()` examples with a visible warning that they are development-only.
- TLS examples must show CA certificate loading, not skip verification.

## Diagrams

- Use Mermaid fenced code blocks for architecture and flow diagrams.
- Keep diagrams simple — complex diagrams should link to an external source.

## Language Conventions in Examples

- SQL examples use **PostgreSQL** syntax exclusively (the Kessel database).
- Consumer/integration logic examples default to **Go** (matching the Kessel team's primary language).

## Client-Package Documentation System

- Client packages use `ClientPackage` Zod schema with `packageManager`, `installCmd`, `language`, and `sdkPackage` fields.
- See AGENTS.md "Client Package Documentation System" section for full component and schema details.

## Zod and Build Patterns

- Zod schemas in `src/schemas/` define frontmatter structure. Extend existing schemas rather than creating new ones.
- `astro check` runs before `astro build` — TypeScript errors fail the build.
- Middleware build errors should be investigated, not suppressed.

## Archived and Deprecated Content

- Deprecated content goes under `archive/` with clear deprecation notices.
- Do not delete archived pages — redirect or cross-link from the replacement.
- VPN-only links (e.g., internal Red Hat systems) must be noted as such.
