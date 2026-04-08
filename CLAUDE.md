# Claude Code Configuration

@AGENTS.md

## Build and Development Commands

This is an Astro/Starlight documentation site. When working in this repository:

### Development workflow
- **Start dev server**: `npm run dev` (serves at `localhost:4321`)
- **Build the site**: `npm run build` (runs `astro check && astro build`, outputs to `./dist/`)
- **Preview build**: `npm run preview` (preview the built site locally)

### Before committing
- Always run `npm run build` to verify TypeScript checks and build pass
- The CI pipeline runs `astro check && astro build` - your changes must pass this
- If you get TypeScript errors, the build will fail - fix them before committing

### Pre-commit hooks
This repository uses `rh-multi-pre-commit` for Red Hat security scanning. The hook runs automatically on commit. If you encounter hook failures unrelated to your changes, notify the team.

## Claude Code Behavioral Preferences

### File modification priority
- **CRITICAL**: This repository has a fork/overlay architecture for internal documentation
- Modifications to `config-overlay.mjs` and `astro.config.mjs` affect internal forks - exercise extreme caution
- The warning in `config-overlay.mjs` is explicit: modifications may break internal mirroring
- When making changes to these files, follow up immediately to resolve conflicts in forks

### Content creation
- Use `.mdx` for pages needing Astro components (`Aside`, `Tabs`, `CodeExamples`, etc.)
- Use `.md` for pure Markdown content
- All frontmatter must include at minimum: `title` and `description`
- Follow the Diataxis framework - know if you're writing tutorial, how-to, explanation, or reference

### Code examples
- Examples live in `src/examples/` organized by topic
- Use region markers for selective inclusion:
  - C-style languages (Go, TS, Java): `//#region name` and `//#endregion`
  - Hash-style languages (Python, Ruby, Bash): `# region name` and `# endregion`
- All important code including error handling must be inside regions

### TypeScript
- Strict mode is enforced via `astro/tsconfigs/strict`
- Path alias `src/*` maps to `./src/*`
- Zod schemas use `.optional().default(false)` for boolean fields - maintain this pattern

### CSS
- Custom CSS is discouraged - the comment in `src/styles/global.css` states: "Use custom css only in exceptional circumstances"
- Prefer Starlight's built-in theming and Tailwind utilities

## Repository-Specific Notes

- **No runtime logic**: This is a documentation site, not an application. Do not introduce backend code, database logic, or application error handling
- **Current API version**: v1beta2 - all references must use v1beta2 paths and namespaces
- **Security in examples**: Never include real credentials. Use placeholders like `"your-client-id"` or `<PASSWORD>`
- **OpenAPI spec**: Pulled from `project-kessel/inventory-api` at build time - do not vendor it
