import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

export { MarkdownTable, RowContent, getJson };

const FIELD_PREFIX = 'DMFIELD';

type HtmlTag = 'p' | 'div' | 'span' | 'h4' | 'h3' | 'h2' | 'h1';

type Alignment = 'center' | 'left' | 'right' | 'justify';

type RowContent = {
  content: string;
  width?: number;
  align?: Alignment;
};

type Field = {
  fieldName: string;
  fieldType: 'open' | 'close';
};

function getJson(jsonFile: string) {
  if (!existsSync(jsonFile)) {
    throw new Error(`json file [${jsonFile}] does not exists!`);
  }
  return JSON.parse(readFileSync(jsonFile, 'utf8'));
}

class MarkdownTable {
  private headerMD = '';
  private bodyMD = '';

  setHeader(header: RowContent[]) {
    let allHeaderRows = '';

    for (const col of header) {
      allHeaderRows = allHeaderRows + this.addRow(col, 'header') + '\n';
    }

    this.headerMD = '  <tr>' + '\n' + allHeaderRows + '  </tr>';
  }

  addBodyRow(body: RowContent[]) {
    let curRow = '';

    for (const col of body) {
      curRow = curRow + this.addRow(col, 'body') + '\n';
    }

    curRow = '  <tr>' + '\n' + curRow + '  </tr>';
    this.bodyMD = (this.bodyMD === '' ? '' : this.bodyMD + '\n') + curRow;
  }

  getTable() {
    const markdownTable = '<table>' + '\n' + this.headerMD + '\n' + this.bodyMD + '\n' + '</table>';
    return markdownTable;
  }

  private addRow(col: RowContent, type: 'header' | 'body') {
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

    return row;
  }
}

export class DMFIELD {
  private updatedFields: string[] = [];
  fields: string[] = [];
  markdownContent = '';

  constructor(private markdownPath: string) {
    if (!existsSync(markdownPath)) {
      throw new Error(`markdown file [${markdownPath}] does not exists!`);
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

    const tmpFields: Field[] = fields.map((fieldStr: string) => {
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
      const curField = tmpFields[x] as Field;

      if (x === 0) {
        continue;
      }

      if (x % 2 === 0) {
        if (curField.fieldType === 'close') {
          throw new Error(`every even field must be an ending one: ${curField.fieldName}`);
        }
      } else {
        if (curField.fieldType === 'open') {
          throw new Error(`every odd field must be an opening one: ${curField.fieldName}`);
        }

        if (curField.fieldName !== tmpFields[x - 1]?.fieldName) {
          throw new Error(`fields [${curField.fieldName}] and [${tmpFields[x - 1]?.fieldName}] have errors, please make sure that the fields are open and closed sequentially.`);
        }

        validFields.push(curField.fieldName);
      }
    }

    if (validFields.length === 0) {
      throw new Error('no dynamic field was found, add at least one before using `dyn-markdown`');
    }

    validFields.forEach((field) => {
      if (field.search(' ') > -1) {
        throw new Error(`a field should not have space in its name: ${field}`);
      }
    });

    return validFields;
  }

  /* ======================================================================== */

  deleteField(field: string) {
    if (!this.fields.includes(field)) {
      throw new Error(`field [${field}] was not found in the file!\nthe current fields are: ${this.fields.join(', ')}\n`);
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

  updateField(fieldToupdate: string, newContent: string) {
    if (!this.fields.includes(fieldToupdate)) {
      throw new Error(`field [${fieldToupdate}] was not found in the file!\nthe current fields are: ${this.fields.join(', ')}\n`);
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

  putContentInsideTag(content: string, tag: HtmlTag, options: { align?: Alignment }) {
    let finalContent = `<${tag}>${content}</${tag}>`;

    if (options.align) {
      finalContent = finalContent.replace(`<${tag}`, `<${tag} align="${options?.align}"`);
    }

    return finalContent;
  }

  putContentInsideNewField(content: string, field: string) {
    if (this.fields.includes(field)) {
      throw new Error(`this function is meant to be used to add a new field, you specified an existing one: ${field}!`);
    }

    const fieldHtmlTag = `${FIELD_PREFIX}:${field}`;
    return `<!-- <${fieldHtmlTag}> -->\n${content}\n<!-- </${fieldHtmlTag}> -->`;
  }

  /* ======================================================================== */

  addSection(content: string, position: 'begin' | 'end' | 'line_after' | 'line_before', searchedLine?: string) {
    if (position.search('line') > -1 && !searchedLine) {
      throw new Error('you must specify the line to search');
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

  saveFile() {
    writeFileSync(this.markdownPath, this.markdownContent);
    const updatedFields = this.updatedFields.length;
    if (updatedFields === 1) {
      console.log(`field ${this.updatedFields[0]} was updated in the [${basename(this.markdownPath)}]`);
    }
    if (updatedFields > 1) {
      console.log(`fields [${this.updatedFields.join(', ')}] were updated in the [${basename(this.markdownPath)}]`);
    }
  }
}
