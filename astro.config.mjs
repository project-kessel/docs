import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://project-kessel.github.io",
  base: "docs",
  integrations: [
    starlight({
      title: "Kessel",
      social: {
        github: "https://github.com/project-kessel",
      },
      editLink: {
        // This enables the "edit" link on the bottom of each page which directly links to contribute
        baseUrl: 'https://github.com/project-kessel/docs/edit/main/',
      },
      sidebar: [
        {
          label: "Start Here",
          items: [
            {
              label: "Kessel Inventory",
              items: [
                { label: "API", link: "./start-here/inventory/inventory-api/" },
                { label: "Kafka events", link: "./start-here/inventory/kafka-event/" },
                { label: "Data persistence", link: "./start-here/inventory/kessel-inventory/" },
                { label: "Resource identification", link: "./start-here/inventory/resource-identification-history/" },
              ]
            },
            { label: "Coming Soon", link: "./start-here/coming-soon/" },
          ],
        },
        {
          label: "For Red Hatters",
          link: "./for-red-hatters/",
          attrs: {
            class: "red-hat",
          },
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
      ],
      customCss: ["./src/tailwind.css", "./src/custom.css"],
    }),
    tailwind({ applyBaseStyles: false }),
  ],
});
