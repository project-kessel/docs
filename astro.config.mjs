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
      sidebar: [
        {
          label: "Start Here",
          items: [
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
