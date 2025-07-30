import { z } from "zod";

/** ───────────────────── Common pieces ───────────────────── */

const Description = z.string().optional();

/* Parameter in a constructor, method, or function */
const ParamSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: Description,
});

/* Possible error names referenced by operations */
const ErrorNameSchema = z.string();

/** ───────────────────── Types section ───────────────────── */

const EnumSchema = z.object({
  enum: z.string(),            // enum name
  description: Description,
  values: z.array(z.string()),
});

const TypesArraySchema = z.array(EnumSchema);

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
  errors: z.array(ErrorNameSchema).optional(),
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

/** ───────────────────── Errors section ───────────────────── */

const ErrorSchema = z.object({
  name: z.string(),
  description: Description,
});

const ErrorsArraySchema = z.array(ErrorSchema);

/** ───────────────────── Root document ───────────────────── */

export const ClientPackageSchema = z
  .object({
    description: Description,
    types: TypesArraySchema.optional(),
    classes: ClassesArraySchema.optional(),
    functions: FunctionsArraySchema.optional(),
    errors: ErrorsArraySchema.optional(),
  })
  .passthrough();

/* Helper TypeScript type if you want strongly-typed objects in code */
export type ClientPackage = z.infer<typeof ClientPackageSchema>;