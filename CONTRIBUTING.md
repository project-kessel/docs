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
config-overlay.mjs          # Fork/overlay hooks for internal documentation
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

This repository can be forked to augment with internal deployment documentation. [config-overlay.mjs](config-overlay.mjs) is designed to be overridden by forks in order to modify the sidebar for the inclusion of e.g. internal documentation.

Keep this in mind when making changes to this repository–note which repository you are working in. Inside the fork, you MUST not modify files which come from the public docs repository. In the public docs repository, care must be taken when modifying explicitly shared and overriden files, like `config-overlay.mjs`.
