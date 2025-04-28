import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://project-kessel.github.io",
  base: "docs",
  integrations: [
    starlight({
      title: "Kessel",
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/project-kessel' },
      ],
      editLink: {
        // This enables the "edit" link on the bottom of each page which directly links to contribute
        baseUrl: 'https://github.com/project-kessel/docs/edit/main/',
      },
      sidebar: [
        {
          label: "Start Here",
          items: [
            { label: "Getting Started", link: "./start-here/getting-started/" },
            { label: "Understanding Kessel", link: "./start-here/understanding-kessel/" },
          ],
        },
        {
          label: "Kessel Inventory",
          items: [
            { label: "API", link: "./inventory/inventory-api/" },
            { label: "Kafka events", link: "./inventory/kafka-event/" },
            { label: "Data persistence", link: "./inventory/kessel-inventory/" },
            { label: "Resource identification", link: "./inventory/resource-identification-history/" },
          ]
        },
        {
          label: "API Reference",
          items: [
            {
              label: "gRPC API Reference",
              link: "https://buf.build/project-kessel/inventory-api/docs/main:kessel.inventory.v1beta2",
              attrs: { target: '_blank' }
            }

          ]
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        {
          label: "For Red Hatters",
          link: "./for-red-hatters/",
          attrs: {
            class: "red-hat",
          },
        }
      ],
      customCss: ["./src/tailwind.css", "./src/custom.css"],

    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});