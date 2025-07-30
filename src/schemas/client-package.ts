import { z } from "zod";

/** ───────────────────── Common pieces ───────────────────── */

const Description = z.string().optional();

/* Parameter in a constructor, method, or function */
const ParamSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: Description,
});

/** ───────────────────── Class section ───────────────────── */

const ConstructorSchema = z.object({
  description: Description,
  name: z.string().optional(),
  params: z.array(ParamSchema).optional(),
});

const PropertySchema = z.object({
  name: z.string(),
  type: z.string(),
  readonly: z.boolean().optional(),
  description: Description,
});

const MethodLikeSchema = z.object({
  name: z.string(),
  description: Description,
  params: z.array(ParamSchema).optional(),
  returns: z.string().optional(),
  async: z.boolean().optional(),
});

const ClassSchema = z.object({
  name: z.string(),
  description: Description,
  constructors: z.array(ConstructorSchema).optional(),
  properties: z.array(PropertySchema).optional(),
  methods: z.array(MethodLikeSchema).optional(),
  statics: z.array(MethodLikeSchema).optional(),
});

const ClassesArraySchema = z.array(ClassSchema);

/** ───────────────────── Functions section ───────────────────── */

const FunctionSchema = MethodLikeSchema; // shape is identical
const FunctionsArraySchema = z.array(FunctionSchema);

/** ───────────────────── Root document ───────────────────── */

export const ClientPackageSchema = z
  .object({
    classes: ClassesArraySchema.optional(),
    functions: FunctionsArraySchema.optional(),
  })
  .passthrough();

/* Helper TypeScript types exported for component use */
export type ClientPackage = z.infer<typeof ClientPackageSchema>;
export type Param = z.infer<typeof ParamSchema>;
export type Constructor = z.infer<typeof ConstructorSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type MethodLike = z.infer<typeof MethodLikeSchema>;
export type Class = z.infer<typeof ClassSchema>;