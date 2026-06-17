# Kessel Documentation

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

[Kessel Documentation](https://project-kessel.github.io/docs/)

## About

This repository contains the source for the [Kessel](https://github.com/project-kessel) documentation site. Kessel is a platform that provides a unified inventory of resources, their relationships, and their changes over time. It offers primitives for resource organization, sharing, entitlement, history tracking, and event publishing -- along with an opinionated RBAC and tenancy model via Kessel RBAC.

This site documents integration patterns, SDK usage, API references, and operational guides for teams building with or running Kessel.

## Tech Stack

- [Astro 5](https://astro.build/) with [Starlight](https://starlight.astro.build/) documentation theme
- [Tailwind CSS v4](https://tailwindcss.com/) via Vite plugin
- [TypeScript](https://www.typescriptlang.org/) in strict mode
- [Zod](https://zod.dev/) for frontmatter schema validation
- [starlight-openapi](https://github.com/HiDeoo/starlight-openapi) plugin (pulls the OpenAPI spec from [inventory-api](https://github.com/project-kessel/inventory-api) at build time)
- [marked](https://marked.js.org/) for Markdown rendering in custom components

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server at localhost:4321
npm run dev

# Build for production (runs astro check && astro build, outputs to ./dist/)
npm run build

# Preview the production build locally
npm run preview
```

## Project Structure

```
src/
  content/docs/             # Documentation pages (.md and .mdx)
    building-with-kessel/     # How-to guides, concepts, reference, archive
    contributing/             # SDK spec, client API reference, writing guide
    running-kessel/           # Architecture, installation, monitoring
    start-here/               # Getting started, understanding Kessel
  components/               # Custom Astro components
  examples/                 # Code examples (Go, Python, TypeScript, Ruby, Java, Bash)
  middleware/               # Starlight route middleware
  schemas/                  # Zod schemas for frontmatter validation
  styles/                   # Global CSS
docs/                       # AI agent guidelines
public/                     # Static assets (favicon)
astro.config.mjs            # Astro and Starlight configuration
config-overlay.mjs          # Fork/overlay hooks for internal documentation
```

## Fork and Overlay Support

This repository is designed to be forked for internal documentation. The `config-overlay.mjs` file provides hook functions to modify the Astro and Starlight configuration (e.g., adding sidebar entries for internal docs) without altering upstream files. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Link Checking

External links in documentation are checked automatically using [lychee](https://github.com/lycheeverse/lychee), a fast link checker written in Rust. This catches broken links, moved pages, and dead URLs before they rot.

### How it runs

- **On pull requests**: checks links in changed docs automatically via GitHub Actions
- **Weekly schedule**: runs every Monday morning to catch link rot between PRs
- **On failure**: scheduled runs auto-create a GitHub issue with the `link-rot` label

### Running locally

Install [lychee](https://github.com/lycheeverse/lychee#installation), then run the check script:

```bash
./scripts/check-links.sh
```

### What gets checked

The checker only validates external HTTP/HTTPS links in `src/content/docs/`. Internal cross-references (root-relative Astro routes like `/docs/building-with-kessel/...`) are skipped since they can't be resolved from source files.

### Excluding a domain

Some domains need to be excluded because they require authentication, block automated requests, or are placeholders in code examples. To add a new exclusion:

1. Edit `.lychee.toml` and add a regex pattern to the appropriate section
2. Escape dots with `\\` (e.g., `"new\\.domain\\.com"`)
3. Add a comment explaining why it's excluded
4. Run `./scripts/check-links.sh` to verify

See `.lychee.toml` for the full list of excluded domains and the reasons for each.

## Further Reading

| Resource | Description |
|----------|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Project structure, commands, writing documentation, and fork/overlay guidance |
| [AGENTS.md](AGENTS.md) | Onboarding context for AI agents: conventions, architecture, and pointers to detailed guidelines |
| [docs/api-contracts-guidelines.md](docs/api-contracts-guidelines.md) | API versioning, SDK conventions, protobuf structures, code example patterns |
| [docs/security-guidelines.md](docs/security-guidelines.md) | OAuth2, TLS, SpiceDB authorization, Kafka SASL auth |
| [docs/integration-guidelines.md](docs/integration-guidelines.md) | Kessel architecture, resource reporting, outbox/CDC, Kafka consumers |
| [docs/performance-guidelines.md](docs/performance-guidelines.md) | gRPC channel reuse, token caching, CDC monitoring, Kafka performance |
| [docs/error-handling-guidelines.md](docs/error-handling-guidelines.md) | Language-specific gRPC error handling, retry patterns, TLS errors |
| [docs/database-guidelines.md](docs/database-guidelines.md) | Inventory DB schema, outbox table, Debezium CDC, Kafka event schemas |

## License

See [LICENSE](LICENSE).
