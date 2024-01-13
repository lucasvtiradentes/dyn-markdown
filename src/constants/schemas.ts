import z from 'zod';

const saveFileOptionsSchema = z.object({
  path: z.string().optional(),
  overwrite: z.boolean().optional()
});

type TSaveFileOptions = z.infer<typeof saveFileOptionsSchema>;

export const FILE_STATUS = {
  close: 'close',
  open: 'open'
} as const;

const dynamicFieldSchema = z.object({
  fieldName: z.string(),
  fieldType: z.enum([FILE_STATUS.open, FILE_STATUS.close])
});

type TDynamicField = z.infer<typeof dynamicFieldSchema>;

export const CELL_ALIGN = {
  center: 'center',
  left: 'left',
  right: 'right',
  justify: 'justify'
} as const;

const cellContentSchema = z.object({
  content: z.string(),
  width: z.number().optional(),
  align: z.enum([CELL_ALIGN.center, CELL_ALIGN.left, CELL_ALIGN.right, CELL_ALIGN.justify]).optional()
});

type TCellContent = z.infer<typeof cellContentSchema>;

type TRowContent = TCellContent[];

export { TCellContent, TDynamicField, TRowContent, TSaveFileOptions, cellContentSchema, saveFileOptionsSchema };
