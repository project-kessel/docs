# Contributing

## 🚀 Project Structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   ├── docs/
│   │   └── config.ts
│   └── env.d.ts
├── astro.config.mjs
├── package.json
├── tailwind.config.mjs
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

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

Follow the [Diátaxis](https://diataxis.fr/) model of documentation, used by projects such as Django and Kubernetes.

> Diátaxis solves problems related to documentation content (what to write), style (how to write it) and architecture (how to organise it).

There are four forms of content. Think about what kind of content you're creating before you create it.

- Tutorials: Step-by-step instructions that teach a new user how to accomplish something technical. The focus is _studying_ as opposed to helping with real-world work. Don't explain too much "why" – that's for Explanation.
- How-to guides: Given a practical, real-world situation (e.g. a deployment or modeling problem) and a more experienced user, teach them how to resolve it.
- Technical reference: Accurate "facts" about Kessel and how it works for experienced users, agnostic of any particular task.
- Explanation: Answers "why" something was done some way with "context and background."

