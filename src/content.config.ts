import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro:content';
import { ClientPackageSchema } from './schemas/client-package';

const docs = defineCollection({
  schema: docsSchema({
    extend: z.object({
      docType: z.enum(["doc", "client-package"]).optional(),
      package: ClientPackageSchema.optional(),
    })
  })
});

export const collections = { docs };
