import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob, file } from 'astro/loaders'
import { ClientPackageSchema } from './schemas/client-package';

const docs = defineCollection({ schema: docsSchema() });

const clientApi = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/pages/contributing/client-api/" }),
  schema: ClientPackageSchema,
});

export const collections = { docs, clientApi };