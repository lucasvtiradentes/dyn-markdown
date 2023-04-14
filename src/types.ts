import z from 'zod';

const SaveFileOptionsSchema = z
  .object({
    path: z.string().optional(),
    overwrite: z.boolean().optional()
  })
  .strict();

type SaveFileOptions = z.infer<typeof SaveFileOptionsSchema>;

const DynamicFieldSchema = z
  .object({
    fieldName: z.string(),
    fieldType: z.union([z.literal('open'), z.literal('close')])
  })
  .strict();

type DynamicField = z.infer<typeof DynamicFieldSchema>;

const CellContentSchema = z
  .object({
    content: z.string(),
    width: z.number().optional(),
    align: z.union([z.literal('center'), z.literal('left'), z.literal('right'), z.literal('justify')]).optional()
  })
  .strict();

type CellContent = z.infer<typeof CellContentSchema>;

type RowContent = CellContent[];

export { SaveFileOptionsSchema, SaveFileOptions, DynamicField, CellContentSchema, CellContent, RowContent };
