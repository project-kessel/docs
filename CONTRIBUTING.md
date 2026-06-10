# Contributing

## Project Structure

This is the Kessel documentation site built with Astro and Starlight. The structure is organized as follows:

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
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Code examples are organized by topic in `src/examples/` with implementations in multiple languages. They use region markers for selective inclusion in documentation.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command             | Action                                           |
| :------------------ | :----------------------------------------------- |
| `npm install`       | Installs dependencies                            |
| `npm run dev`       | Starts local dev server at `localhost:4321`      |
| `npm run build`     | Build your production site to `./dist/`          |
| `npm run preview`   | Preview your build locally, before deploying     |
| `npm run astro ...` | Run CLI commands like `astro add`, `astro check` |

## Writing documentation

See [Writing documentation](src/content/docs/contributing/documentation.mdx).

## Internal documentation

This repository contains the public Kessel documentation. Supplemental internal documentation covering Red Hat-specific onboarding, hosted environment configuration, operational runbooks, and monitoring, is maintained separately and published to InScope (Red Hat's internal developer portal, accessible via VPN). The internal docs expand on the public content with details that cannot be published externally.

When contributing, keep content in the right place:
- **Public docs (this repo)**: Integration guides, SDK docs, API reference, concepts, and anything relevant to all Kessel users.
- **Internal docs (InScope)**: Red Hat-specific configuration, credentials setup, ephemeral testing, hosted architecture, runbooks, and monitoring procedures.
