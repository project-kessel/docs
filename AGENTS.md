# AGENTS.md

This file provides onboarding context for AI agents working in the `docs` repository. It covers cross-cutting conventions, architectural context, and pointers to detailed guidelines. For the project overview, see [README.md](README.md). For contribution basics, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Guidelines Index

Detailed domain-specific guidelines are maintained in the `docs/` directory. Read these before making changes in the relevant area:

| Guideline | Covers |
|-----------|--------|
| [docs/api-contracts-guidelines.md](docs/api-contracts-guidelines.md) | API versioning (v1beta2), SDK conventions, ClientBuilder, protobuf message structures, CloudEvents, KSL schema, code example patterns |
| [docs/security-guidelines.md](docs/security-guidelines.md) | OAuth2 client credentials, TLS configuration, SpiceDB authorization model, KSL permissions, role bindings, Kafka SASL auth |
| [docs/integration-guidelines.md](docs/integration-guidelines.md) | Kessel architecture (Inventory + Relations APIs), resource reporting patterns, outbox/CDC, Kafka consumers, SDK integration docs |
| [docs/performance-guidelines.md](docs/performance-guidelines.md) | gRPC channel reuse, token caching, native compilation in CI, CDC monitoring KPIs, Kafka consumer performance, LISTEN/NOTIFY |
| [docs/error-handling-guidelines.md](docs/error-handling-guidelines.md) | Language-specific gRPC error handling, retry patterns, monitoring metrics, TLS errors, Astro/Zod schema errors |
| [docs/database-guidelines.md](docs/database-guidelines.md) | Inventory DB schema conventions, outbox table structure, Debezium CDC, Kafka event schemas, Mermaid diagrams |

## Source Repositories

This documentation project references multiple source code repositories. The `docs/sources.yaml` file lists all relevant repositories and metadata. AI agents use this file to:

- Discover which repositories to analyze
- Understand repository types (api, sdk, schema, service)
- Get GitHub URLs for cloning if needed
- Generate documentation from implementation details

The file structure:

```yaml
repositories:
  - name: inventory-api
    type: api
    github: https://github.com/project-kessel/inventory-api
    description: Brief description
    technologies: [Go, gRPC, ...]
```

**To locate repositories locally:**
1. Check parent directory: `../repository-name/`
2. Search common project directories
3. If not found, ask the user for the path or offer to clone from GitHub

When generating documentation from source code (e.g., explaining architectural patterns, documenting APIs), always check `docs/sources.yaml` first to discover relevant repositories. If you discover new repositories that should be documented, suggest updating this file.

## What This Repository Is

This is an **Astro/Starlight documentation site**, not an application runtime. There is no database, no server, no deployed backend code. The content documents Kessel integration patterns for external service providers. Understand this distinction before making changes -- do not introduce runtime logic, backend code, or application error handling into the site itself.

Key technology stack:
- **Astro 5** with **Starlight** documentation theme
- **Tailwind CSS v4** (via Vite plugin)
- **TypeScript** in strict mode (`astro/tsconfigs/strict`)
- **Zod** for frontmatter schema validation
- **starlight-openapi** plugin pulling the OpenAPI spec from `inventory-api` at build time
- **marked** for Markdown rendering in custom components

## Build and CI

Commands (run from repo root):
- `npm run dev` -- local dev server at `localhost:4321`
- `npm run build` -- runs `astro check && astro build`, outputs to `./dist/`
- `npm run preview` -- preview the built site locally

CI pipeline (`.github/workflows/ci.yml`): runs `withastro/action@v2` on every PR to `main`. This performs `npm install` and a full build. If the build fails, the PR cannot merge.

Deployment (`.github/workflows/deploy.yml`): on push to `main`, builds and deploys to GitHub Pages. Only runs when `github.repository == 'project-kessel/docs'` (not on forks).

The site is served at `https://project-kessel.github.io/docs/` with `base: "docs"`.

## Repository Structure

```
src/
  content/docs/           # Documentation pages (.md and .mdx)
    building-with-kessel/   # User-facing docs (how-to, concepts, reference, archive)
    contributing/           # SDK spec, client API reference, writing guide
    running-kessel/         # Architecture, installation, monitoring
    start-here/             # Getting started, understanding Kessel
  components/             # Custom Astro components
  examples/               # Code examples in multiple languages
  middleware/             # Starlight route middleware
  schemas/                # Zod schemas for frontmatter validation
  styles/                 # Global CSS (minimal custom styles)
docs/                     # AI agent guidelines (this index points here)
public/                   # Static assets (favicon)
```

## Content Authoring Conventions

### File format
- Use `.mdx` for pages that need Astro components (`Aside`, `Tabs`, `TabItem`, `Code`, `LinkCard`, `CodeExamples`, etc.). Use `.md` for pure Markdown content.
- Frontmatter is required. At minimum: `title` and `description`.
- Use `sidebar.order` in frontmatter to control navigation ordering (lower numbers first).

### Diataxis model
This project follows the [Diataxis](https://diataxis.fr/) documentation framework. Know whether you are writing a tutorial, how-to guide, explanation, or reference, and write accordingly. See `src/content/docs/contributing/documentation.mdx` for full principles.

### Current vs. archived content
- Current docs go under `building-with-kessel/how-to/` or `building-with-kessel/concepts/`.
- Deprecated content (v1beta1) goes under `building-with-kessel/archive/` with a deprecation notice.
- Archive content is collapsed in the sidebar with an "Outdated" badge. Do not treat it as current guidance.

### Diagrams
- Use **Mermaid** syntax directly in `.md`/`.mdx` files. ER diagrams use `erDiagram`, flow diagrams use `flowchart LR`.

## Code Examples

### Location and structure
Examples live in `src/examples/` organized by topic (e.g., `getting-started/`, `tls/`). Each topic has the same example implemented in multiple languages.

### Supported languages and file naming
Files follow the pattern `example.{ext}` or `example.{variant}.{ext}`:
- `.go` (Go), `.py` (Python), `.ts` (TypeScript), `.rb` (Ruby), `.java` (Java), `.sh` (Bash)
- Variant naming: `example.curl.sh` and `example.grpcurl.sh` produce separate tabs ("curl" and "grpcurl")

### Region markers
Examples use region markers for selective inclusion in docs via the `CodeExamples` component:
- C-style languages (Go, TS, Java): `//#region name` and `//#endregion`
- Hash-style languages (Python, Ruby, Bash): `# region name` and `# endregion`

All important code (including error handling) must be inside the appropriate region to render correctly.

### CodeExamples component usage
In `.mdx` files:
```mdx
import CodeExamples from 'src/components/CodeExamples.astro';
export const files = import.meta.glob('/src/examples/topic/example.*', { query: '?raw', eager: true, import: 'default' });
<CodeExamples files={files} regions="regionName" />
```

The component auto-sorts tabs by language (Bash, Python, Go, JS, TS, Ruby, Java).

## Client Package Documentation System

Pages with `docType: client-package` in frontmatter use a structured `package` field (validated by `src/schemas/client-package.ts`) to auto-generate API reference documentation. The schema supports `interfaces`, `classes` (with constructors, properties, methods, statics), and `functions`. Methods and constructors can be scoped to specific languages via an optional `languages` array.

This system has three cooperating parts:
1. **Zod schema** (`src/schemas/client-package.ts`) -- validates the frontmatter structure
2. **MarkdownContent override** (`src/components/MarkdownContent.astro`) -- detects `docType: client-package` and renders `ClientPackageDescription` instead of default content
3. **Route middleware** (`src/middleware/client-package-toc.ts`) -- generates table-of-contents headings from the package structure

When editing client-package pages, the API surface is defined entirely in YAML frontmatter, not in the Markdown body. The specification uses JavaScript conventions (`camelCase`) as canonical; implementations transform to language-specific conventions.

## Fork and Overlay Architecture

This repository is designed to be forked for internal documentation. The `config-overlay.mjs` file provides two hook functions:
- `applyTopLevelOverlay(config)` -- modifies top-level Astro config (site URL, base path, integrations)
- `applyStarlightOverlay(starlightConfig)` -- modifies Starlight config (sidebar entries, plugins)

**Critical rule**: In the public repository, changes to `config-overlay.mjs` and `astro.config.mjs` must be made carefully as they affect internal forks. The warning in `config-overlay.mjs` is explicit: modifications may break internal mirroring. In a fork, you MUST NOT modify files that originate from the public repository.

## Cross-Cutting Conventions

### API version references
The current version is **v1beta2**. All new content must reference v1beta2 paths (`/api/kessel/v1beta2/...`) and gRPC namespaces (`kessel.inventory.v1beta2`). Do not introduce v1beta1 references outside of `archive/`.

### Custom CSS policy
Custom CSS is discouraged. The comment in `src/styles/global.css` states: "Use custom css only in exceptional circumstances." Prefer Starlight's built-in theming and Tailwind utilities.

### TypeScript
Strict mode is enforced. Path aliases are configured: `src/*` maps to `./src/*`. Zod schemas use `.optional().default(false)` for boolean fields -- maintain this pattern.

### Security in examples
- Never include real credentials. Use placeholders (`"your-client-id"`, `<PASSWORD>`).
- Getting-started examples use `insecure()` mode with a comment indicating it is for local development only.
- TLS examples demonstrate loading CA certificates, never disabling TLS verification.

### External references
- Link to Buf Schema Registry for protobuf types rather than duplicating definitions.
- The OpenAPI spec is pulled from `project-kessel/inventory-api` at build time -- do not vendor it.
- Cross-references to Red Hat internal guides must note VPN requirements.

### PR expectations
- Every code or system change must be accompanied by documentation updates.
- The CI build (`astro check && astro build`) must pass -- TypeScript errors and broken references will fail the build.
- Comment the API spec (protobuf) if your change affects API behavior.
