import z from 'zod';

const saveFileOptionsSchema = z.object({
  path: z.string().optional(),
  overwrite: z.boolean().optional()
});

type TSaveFileOptions = z.infer<typeof saveFileOptionsSchema>;

const dynamicFieldSchema = z.object({
  fieldName: z.string(),
  fieldType: z.union([z.literal('open'), z.literal('close')])
});

type TDynamicField = z.infer<typeof dynamicFieldSchema>;

const cellContentSchema = z.object({
  content: z.string(),
  width: z.number().optional(),
  align: z.union([z.literal('center'), z.literal('left'), z.literal('right'), z.literal('justify')]).optional()
});

type TCellContent = z.infer<typeof cellContentSchema>;

type TRowContent = TCellContent[];

export { TCellContent, TDynamicField, TRowContent, TSaveFileOptions, cellContentSchema, saveFileOptionsSchema };
