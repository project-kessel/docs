import { defineCollection } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';
import { ClientPackageSchema } from './schemas/client-package';

const docs = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      docType: z.enum(["doc", "client-package"]).optional(),
      package: ClientPackageSchema.optional(),
    })
  })
});

const i18n = defineCollection({
  loader: i18nLoader(),
  schema: i18nSchema()
});

export const collections = {
  docs,
  i18n,
};
