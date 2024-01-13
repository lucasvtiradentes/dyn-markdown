import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import { FIELD_PREFIX } from '../constants/configs';
import type { DynamicField, SaveFileOptions } from '../constants/schemas';
import { SaveFileOptionsSchema } from '../constants/schemas';

const MAKRDOWN_ERRORS = {
  noFieldsFound: `no dynamic field was found, add at least one before using: <${FIELD_PREFIX}:NAME>[content]</${FIELD_PREFIX}:NAME>`,
  fileDoesNotExist: (file: string) => `specified file [${file}] does not exist`,
  folderDoesNotExist: (folder: string) => `the specified path folder doesnt exist [${folder}]!`,
  outputFileAlreadyExists: (file: string) => `the specified file already exists [${file}] and you didnt allow overwriting!`,
  fieldWithNoClosingTag: (field: string) => `every even field must be an ending one: ${field}`,
  fieldWithNoOpeningTag: (field: string) => `every odd field must be an opening one: ${field}`,
  overlapingFields: (field1: string, field2: string) => `fields [${field1}] and [${field2}] have errors, please make sure that the fields are open and closed sequentially.`,
  fieldNameWithSpaces: (field: string) => `a field should not have space in its name: ${field}`,
  missingField: (field: string, validFields: string) => `field [${field}] was not found in the file!\nthe current fields are: ${validFields}\n`,
  mustSpecifyLineToSearch: `when using 'line_after' or 'line_before', you must specify a line to search`,
  invalidSaveFileOptions: 'you must specify a valid options object to saveFile function'
};

export default class DynMarkdown {
  private updatedFields: string[] = [];
  fields: string[] = [];
  markdownContent = '';

  constructor(private markdownPath: string) {
    if (!existsSync(markdownPath)) {
      throw new Error(MAKRDOWN_ERRORS.fileDoesNotExist(markdownPath));
    }

    this.markdownPath = markdownPath;
    this.markdownContent = readFileSync(markdownPath, 'utf8');
    this.fields = this.getFields(this.markdownContent);
  }

  private getFields(mdContent: string) {
    const mdByLines = mdContent.split('\n');
    const fields = mdByLines.reduce((acc: string[], cur: string) => (cur.search(`${FIELD_PREFIX}:`) > -1 ? [...acc, cur] : acc), [] as string[]);
    const validatedFields = this.validateFields(fields);
    return validatedFields;
  }

  private validateFields(fields: string[]) {
    const validFields: string[] = [];

    const tmpFields: DynamicField[] = fields.map((fieldStr: string) => {
      const strWithoutCommentsReg = /<!-- ([^;]+) -->/.exec(fieldStr);
      const strWithoutCommentsStr = (strWithoutCommentsReg ? strWithoutCommentsReg[1] : '') ?? '';
      const fieldOpenReg = new RegExp(`<${FIELD_PREFIX}:([^;]+)>`).exec(strWithoutCommentsStr);
      const fieldOpenStr = fieldOpenReg ? fieldOpenReg[1] : '';
      const fieldCloseReg = new RegExp(`</${FIELD_PREFIX}:([^;]+)>`).exec(strWithoutCommentsStr);
      const fieldCloseStr = (fieldCloseReg ? fieldCloseReg[1] : '') ?? '';

      return {
        fieldName: fieldOpenStr ? fieldOpenStr : fieldCloseStr,
        fieldType: fieldOpenStr ? 'open' : 'close'
      };
    });

    for (let x = 0; x < tmpFields.length; x++) {
      const curField = tmpFields[x] as DynamicField;

      if (x === 0) {
        continue;
      }

      if (x % 2 === 0) {
        if (curField.fieldType === 'close') {
          throw new Error(MAKRDOWN_ERRORS.fieldWithNoClosingTag(curField.fieldName));
        }
      } else {
        if (curField.fieldType === 'open') {
          throw new Error(MAKRDOWN_ERRORS.fieldWithNoOpeningTag(curField.fieldName));
        }

        if (curField.fieldName !== tmpFields[x - 1]?.fieldName) {
          throw new Error(MAKRDOWN_ERRORS.overlapingFields(curField.fieldName, tmpFields[x - 1]?.fieldName));
        }

        validFields.push(curField.fieldName);
      }
    }

    if (validFields.length === 0) {
      throw new Error(MAKRDOWN_ERRORS.noFieldsFound);
    }

    validFields.forEach((field) => {
      if (field.search(' ') > -1) {
        throw new Error(MAKRDOWN_ERRORS.fieldNameWithSpaces(field));
      }
    });

    return validFields;
  }

  /* ======================================================================== */

  updateField(fieldToupdate: string, newContent: string) {
    if (!this.fields.includes(fieldToupdate)) {
      throw new Error(MAKRDOWN_ERRORS.missingField(fieldToupdate, this.fields.join(', ')));
    }

    const contentSplitedArr = this.markdownContent.split(/\r?\n/);
    const searchString = `${FIELD_PREFIX}:${fieldToupdate}`;

    let initialRow = NaN;
    let finalRow = NaN;
    let fieldIdentation = NaN;

    const updatedMarkdown = contentSplitedArr.reduce((acc: any, line: string, index: number) => {
      const isInitialRow = line.search(`<${searchString}>`) > -1;
      const isFinalRow = line.search(`</${searchString}>`) > -1;

      if (isInitialRow) {
        initialRow = index;
        const row = acc ? acc + '\n' + line : line;
        return row;
      } else if (isFinalRow) {
        finalRow = index;
        const contentWithIdentation = newContent
          .split(/\r?\n/)
          .map((row: string) => ' '.repeat(fieldIdentation) + row)
          .join('\n');
        const row = (acc ? acc + '\n' + contentWithIdentation : contentWithIdentation) + '\n' + line;
        return row;
      } else if (Number.isNaN(initialRow)) {
        // before initialRow
        const row = acc ? acc + '\n' + line : line;
        return row;
      } else if (!Number.isNaN(finalRow)) {
        // after finalRow
        const row = acc ? acc + '\n' + line : line;
        return row;
      } else {
        // between initialRow and finalRow
        if (Number.isNaN(fieldIdentation)) {
          fieldIdentation = line.length - line.trimStart().length;
        }
        return acc;
      }
    }, '');

    this.markdownContent = updatedMarkdown;
    this.updatedFields.push(fieldToupdate);
  }

  deleteField(field: string) {
    if (!this.fields.includes(field)) {
      throw new Error(MAKRDOWN_ERRORS.missingField(field, this.fields.join(', ')));
    }

    const contentSplitedArr = this.markdownContent.split(/\r?\n/);
    const searchString = `${FIELD_PREFIX}:${field}`;

    let initialRow = NaN;
    let finalRow = NaN;

    const updatedMarkdown = contentSplitedArr.reduce((acc: any, line: string, index: number) => {
      const isInitialRow = line.search(`<${searchString}>`) > -1;
      const isFinalRow = line.search(`</${searchString}>`) > -1;

      if (isInitialRow) {
        initialRow = index;
        return acc;
      } else if (isFinalRow) {
        finalRow = index;
        return acc;
      } else if (Number.isNaN(initialRow)) {
        // before initialRow
        const row = acc ? acc + '\n' + line : line;
        return row;
      } else if (!Number.isNaN(finalRow)) {
        // after finalRow
        const row = acc ? acc + '\n' + line : line;
        return row;
      } else {
        // between initialRow and finalRow
        return acc;
      }
    }, '');

    this.markdownContent = updatedMarkdown;
    this.fields = this.getFields(this.markdownContent);
  }

  addSection(content: string, position: 'begin' | 'end' | 'line_after' | 'line_before', searchedLine?: string) {
    if (position.search('line') > -1 && !searchedLine) {
      throw new Error(MAKRDOWN_ERRORS.mustSpecifyLineToSearch);
    }

    const contentSplitedArr = this.markdownContent.split(/\r?\n/);
    let finalContent = '';

    if (position === 'begin') {
      finalContent = contentSplitedArr.reduce((acc: any, line: string, index: number) => {
        const isFirstLine = index === 0;

        if (isFirstLine) {
          const row = content + '\n' + (acc ? acc + '\n' + line : line);
          return row;
        } else {
          const row = acc ? acc + '\n' + line : line;
          return row;
        }
      }, '');
    } else if (position === 'end') {
      finalContent = contentSplitedArr.reduce((acc: any, line: string, index: number) => {
        const isLastLine = index === contentSplitedArr.length - 1;

        if (isLastLine) {
          const row = (acc ? acc + '\n' + line : line) + '\n' + content;
          return row;
        } else {
          const row = acc ? acc + '\n' + line : line;
          return row;
        }
      }, '');
    } else if (position.search('line') > -1) {
      finalContent = contentSplitedArr.reduce((acc: any, line: string) => {
        const isSearchedLine = line.search(`${searchedLine}`) > -1;

        if (isSearchedLine) {
          let row = acc ? acc + '\n' + line : line;

          if (position === 'line_after') {
            row = (acc ? acc + '\n' + line : line) + '\n' + content;
          } else if (position === 'line_before') {
            row = acc ? acc + '\n' + content + '\n' + line : content + '\n' + line;
          }

          return row;
        } else {
          const row = acc ? acc + '\n' + line : line;
          return row;
        }
      }, '');
    }

    this.markdownContent = finalContent;
    this.fields = this.getFields(this.markdownContent);
  }

  /* ======================================================================== */

  saveFile(options?: SaveFileOptions) {
    let finalPath = this.markdownPath;

    if (options && !SaveFileOptionsSchema.safeParse(options).success) {
      throw new Error(MAKRDOWN_ERRORS.invalidSaveFileOptions);
    }

    if (options?.path) {
      if (!options?.overwrite && existsSync(options.path)) {
        throw new Error(MAKRDOWN_ERRORS.outputFileAlreadyExists(options.path));
      }

      if (!dirname(options.path)) {
        throw new Error(MAKRDOWN_ERRORS.folderDoesNotExist(options.path));
      }

      finalPath = options.path;
    }

    writeFileSync(finalPath, this.markdownContent);
    const updatedFields = this.updatedFields.length;

    if (updatedFields === 1) {
      console.log(`field ${this.updatedFields[0]} was updated in the [${basename(this.markdownPath)}]`);
    }
    if (updatedFields > 1) {
      console.log(`fields [${this.updatedFields.join(', ')}] were updated in the [${basename(this.markdownPath)}]`);
    }

    return true;
  }
}
