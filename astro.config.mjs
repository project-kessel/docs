import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi'
import tailwindcss from "@tailwindcss/vite";

// Import config overlay functions with fallback for when file doesn't exist
let applyTopLevelOverlay, applyStarlightOverlay;
try {
  const overlay = await import("./config-overlay.mjs");
  applyTopLevelOverlay = overlay.applyTopLevelOverlay || ((config) => config);
  applyStarlightOverlay = overlay.applyStarlightOverlay || ((config) => config);
} catch {
  // Default no-op functions if config-overlay.mjs doesn't exist
  applyTopLevelOverlay = (config) => config;
  applyStarlightOverlay = (config) => config;
}

// Define base Starlight configuration
const baseStarlightConfig = {
  title: "Kessel",
  social: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/project-kessel' },
  ],
  editLink: {
    // This enables the "edit" link on the bottom of each page which directly links to contribute
    baseUrl: 'https://github.com/project-kessel/docs/edit/main/',
  },
  plugins: [
    starlightOpenAPI([
      {
        base: 'building-with-kessel/reference/http-api',
        schema: 'https://raw.githubusercontent.com/project-kessel/inventory-api/refs/heads/main/openapi.yaml',
        sidebar: {
          label: "🚧 HTTP API",
        }
      },
    ]),
  ],
  sidebar: [
    {
      label: "Start Here",
      items: [
        "start-here/getting-started",
        "start-here/understanding-kessel",
      ],
    },
    {
      label: "Building with Kessel",
      items: [
        {
          label: "How To",
          autogenerate: { directory: 'building-with-kessel/how-to' }
        },
        {
          label: "Concepts",
          autogenerate: { directory: 'building-with-kessel/concepts' },
        },
        {
          label: "Reference",
          items: [
            'building-with-kessel/reference/schema',
            'building-with-kessel/reference/glossary',
            {
              label: "gRPC API",
              link: "https://buf.build/project-kessel/inventory-api/docs/main:kessel.inventory.v1beta2",
              attrs: { target: '_blank' }
            },
            ...openAPISidebarGroups,
          ]
        },
        {
          label: "Archive",
          badge: "Outdated",
          collapsed: true,
          items: [
            'building-with-kessel/archive/inventory-api',
            'building-with-kessel/archive/kafka-event',
            "building-with-kessel/archive/kessel-inventory",
            "building-with-kessel/archive/resource-identification-history",
          ]
        },
      ]
    },
    {
      label: "Running Kessel",
      collapsed: true,
      items: [
        'running-kessel/architecture',
        {
          label: "Installation",
          autogenerate: { directory: 'running-kessel/installation' }
        },
        {
          label: "Monitoring Kessel",
          autogenerate: { directory: 'running-kessel/monitoring-kessel' }
        }
      ]
    },
    {
      label: "Contributing",
      collapsed: true,
      items: [
        'contributing/documentation',
        'contributing/client-libraries',
        {
          label: "Client API Reference",
          autogenerate: { directory: 'contributing/client-api' }
        }
      ]
    }
  ],
  components: {
    // Overridden to template out client package descriptions based on frontmatter.
    // Otherwise this is the default MarkdownContent component.
    MarkdownContent: './src/components/MarkdownContent.astro',
  },
  routeMiddleware: './src/middleware/client-package-toc.ts',
  customCss: ["./src/tailwind.css", "./src/custom.css"],
};

// Apply Starlight overlay to the Starlight configuration
const starlightConfig = applyStarlightOverlay(baseStarlightConfig);

// Define base top-level Astro configuration
const baseConfig = {
  site: "https://project-kessel.github.io",
  base: "docs",
  integrations: [
    starlight(starlightConfig),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
};

// Apply top-level overlay and export the final config
export default defineConfig(applyTopLevelOverlay(baseConfig));
