import { CONFIGS } from './configs';
import { TCellContent } from './schemas';

const cellContent: TCellContent = {
  content: 'cell content',
  width: 200,
  align: 'center'
};

export const ERRORS = {
  // MARKDOWN
  noFieldsFound: `no dynamic field was found, add at least one before using: <${CONFIGS.FIELD_PREFIX}:NAME>[content]</${CONFIGS.FIELD_PREFIX}:NAME>`,
  fileDoesNotExist: (file: string) => `specified file [${file}] does not exist`,
  folderDoesNotExist: (folder: string) => `the specified path folder doesnt exist [${folder}]!`,
  outputFileAlreadyExists: (file: string) => `the specified file already exists [${file}] and you didnt allow overwriting!`,
  fieldWithNoClosingTag: (field: string) => `every even field must be an ending one: ${field}`,
  fieldWithNoOpeningTag: (field: string) => `every odd field must be an opening one: ${field}`,
  overlapingFields: (field1: string, field2: string) => `fields [${field1}] and [${field2}] have errors, please make sure that the fields are open and closed sequentially.`,
  fieldNameWithSpaces: (field: string) => `a field should not have space in its name: ${field}`,
  missingField: (field: string, validFields: string) => `field [${field}] was not found in the file!\nthe current fields are: ${validFields}\n`,
  mustSpecifyLineToSearch: `when using 'line_after' or 'line_before', you must specify a line to search`,
  TinvalidSaveFileOptions: 'you must specify a valid options object to saveFile function',

  // TABLE
  tableRowIsNotValid: `you provided a invalid table row object, the correct format is an array of the following object type:\n${JSON.stringify(cellContent)}`,
  columnNotFound: (column: string, allColumns: string) => `you must specify a valid column to join: [${column}] is not part of [${allColumns}]`,

  // OTHER
  jsonDoesNotExists: (jsonFile: string) => `json file [${jsonFile}] does not exists!`
};
