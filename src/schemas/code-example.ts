import { z } from "zod";

export const CodeExampleSchema = z.object({
    language: z.string(),
    order: z.number(),
});

export type CodeExample = z.infer<typeof CodeExampleSchema>;
