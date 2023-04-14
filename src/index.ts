import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import type { RowContent, CellContent, DynamicField, SaveFileOptions } from './types';
import { CellContentSchema, SaveFileOptionsSchema } from './types';

const FIELD_PREFIX = 'DYNFIELD';

function getJson(jsonFile: string) {
  if (!existsSync(jsonFile)) {
    throw new Error(`json file [${jsonFile}] does not exists!`);
  }
  return JSON.parse(readFileSync(jsonFile, 'utf8'));
}

class MarkdownTable {
  private headerMD = '';
  private headerItems: RowContent = [];
  private bodyItems: RowContent[] = [];
  private cellContent: CellContent = {
    content: 'cell content',
    width: 200,
    align: 'center'
  };
  private ERRORS = {
    tableRowIsNotValid: `you provided a invalid table row object, the correct format is an array of the following object type:\n${JSON.stringify(this.cellContent)}`,
    columnNotFound: (column: string, allColumns: string) => `you must specify a valid column to join: [${column}] is not part of [${allColumns}]`
  };

  private isValidTableRow(tableRow: RowContent) {
    const onlyValidItems = tableRow.filter((boiler) => CellContentSchema.safeParse(boiler).success);
    const isValidRow = tableRow.length === onlyValidItems.length;
    return isValidRow;
  }

  setHeader(header: RowContent) {
    if (!this.isValidTableRow(header)) {
      throw new Error(this.ERRORS.tableRowIsNotValid);
    }

    let allHeaderRows = '';

    for (const col of header) {
      allHeaderRows = allHeaderRows + this.addRow(col, 'header') + '\n';
    }
    this.headerItems = header;
    this.headerMD = '  <tr>' + '\n' + allHeaderRows + '  </tr>';
  }

  addBodyRow(body: RowContent) {
    if (!this.isValidTableRow(body)) {
      throw new Error(this.ERRORS.tableRowIsNotValid);
    }
    this.bodyItems.push(body);
  }

  private getBodyMd(allBody: RowContent[], columnToJoinIndex?: number) {
    let allBodyMD = '';
    const uniqueItems: string[] = [];

    for (const body of allBody) {
      let curRow = '';

      body.forEach((col, index) => {
        if (columnToJoinIndex !== undefined && index === columnToJoinIndex) {
          if (!uniqueItems.includes(col.content)) {
            const qnt = allBody.map((item) => item[columnToJoinIndex]).filter((item) => item?.content === col.content).length;
            uniqueItems.push(col.content);
            curRow = curRow + this.addRow(col, 'body', { quantity: qnt }) + '\n';
          } else {
            curRow = curRow + this.addRow(col, 'body', { comment: true }) + '\n';
          }
        } else {
          curRow = curRow + this.addRow(col, 'body') + '\n';
        }
      });

      curRow = '  <tr>' + '\n' + curRow + '  </tr>';
      allBodyMD = (allBodyMD === '' ? '' : allBodyMD + '\n') + curRow;
    }

    return allBodyMD;
  }

  getTable(columnToJoin?: string) {
    let finalBody = '';

    if (columnToJoin) {
      const allColumns = this.headerItems.map((item) => item.content);
      if (!allColumns.includes(columnToJoin)) {
        throw new Error(this.ERRORS.columnNotFound(columnToJoin, allColumns.join(', ')));
      }

      const columnIndex = this.headerItems.findIndex((item) => item.content === columnToJoin);
      finalBody = this.getBodyMd(this.bodyItems, columnIndex);
    } else {
      finalBody = this.getBodyMd(this.bodyItems);
    }

    const markdownTable = '<table>' + '\n' + this.headerMD + '\n' + finalBody + '\n' + '</table>';
    return markdownTable;
  }

  private addRow(col: CellContent, type: 'header' | 'body', options?: { quantity?: number; comment?: true }) {
    const { content, width, align } = col;
    const rowType = type === 'header' ? 'th' : 'td';

    let row = '';
    row = `    <${rowType}>${content}</${rowType}>`;

    if (width) {
      row = row.replace(`<${rowType}`, `<${rowType} width="${width}"`);
    }

    if (align) {
      row = row.replace(`<${rowType}`, `<${rowType} align="${align}"`);
    }

    if (options?.quantity) {
      row = row.replace(`<${rowType}`, `<${rowType} rowspan="${options?.quantity}"`);
    }

    if (options?.comment) {
      row = `<!-- ${row} -->`;
    }

    return row;
  }
}

class DynMarkdown {
  private updatedFields: string[] = [];
  fields: string[] = [];
  markdownContent = '';
  private ERRORS = {
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

  constructor(private markdownPath: string) {
    if (!existsSync(markdownPath)) {
      throw new Error(this.ERRORS.fileDoesNotExist(markdownPath));
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
          throw new Error(this.ERRORS.fieldWithNoClosingTag(curField.fieldName));
        }
      } else {
        if (curField.fieldType === 'open') {
          throw new Error(this.ERRORS.fieldWithNoOpeningTag(curField.fieldName));
        }

        if (curField.fieldName !== tmpFields[x - 1]?.fieldName) {
          throw new Error(this.ERRORS.overlapingFields(curField.fieldName, tmpFields[x - 1]?.fieldName));
        }

        validFields.push(curField.fieldName);
      }
    }

    if (validFields.length === 0) {
      throw new Error(this.ERRORS.noFieldsFound);
    }

    validFields.forEach((field) => {
      if (field.search(' ') > -1) {
        throw new Error(this.ERRORS.fieldNameWithSpaces(field));
      }
    });

    return validFields;
  }

  /* ======================================================================== */

  updateField(fieldToupdate: string, newContent: string) {
    if (!this.fields.includes(fieldToupdate)) {
      throw new Error(this.ERRORS.missingField(fieldToupdate, this.fields.join(', ')));
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
      throw new Error(this.ERRORS.missingField(field, this.fields.join(', ')));
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
      throw new Error(this.ERRORS.mustSpecifyLineToSearch);
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
      throw new Error(this.ERRORS.invalidSaveFileOptions);
    }

    if (options?.path) {
      if (!options?.overwrite && existsSync(options.path)) {
        throw new Error(this.ERRORS.outputFileAlreadyExists(options.path));
      }

      if (!dirname(options.path)) {
        throw new Error(this.ERRORS.folderDoesNotExist(options.path));
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

export { DynMarkdown, MarkdownTable, getJson };
