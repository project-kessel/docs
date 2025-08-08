import { z } from "zod";

/** ───────────────────── Common pieces ───────────────────── */

const Description = z.string().optional();

/* ───────────────────── Type representation ───────────────────── */

const TypeSchema = z.object({
  name: z.string(),
  link: z.string().optional(),
});

/* Parameter in a constructor, method, or function */
const ParamSchema = z.object({
  type: TypeSchema,
  name: z.string(),
  description: Description,
  optional: z.boolean().optional().default(false),
});

/** ───────────────────── Class section ───────────────────── */

const ConstructorSchema = z.object({
  description: Description,
  name: z.string().optional(),
  params: z.array(ParamSchema).optional(),
  // Optional list of languages this constructor applies to. If omitted,
  // the constructor is considered applicable to all languages.
  languages: z.array(z.string()).optional(),
});

const PropertySchema = z.object({
  name: z.string(),
  type: TypeSchema,
  readonly: z.boolean().optional(),
  description: Description,
});

const MethodLikeSchema = z.object({
  name: z.string(),
  description: Description,
  params: z.array(ParamSchema).optional(),
  returns: TypeSchema.optional(),
  async: z.boolean().optional(),
  // Optional list of languages this method/function applies to. If omitted,
  // the method/function is considered applicable to all languages.
  languages: z.array(z.string()).optional(),
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
export type Type = z.infer<typeof TypeSchema>;