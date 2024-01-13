import { ERRORS } from '../constants/errors';
import { cellContentSchema, TCellContent, TRowContent } from '../constants/schemas';

type WithContent<T> = T extends { content: infer U } ? U : never;
type ExtractContent<T extends readonly any[]> = { [K in keyof T]: WithContent<T[K]> };

export default class MarkdownTable<TColumnItem extends ReadonlyArray<TCellContent>> {
  private headerMD = '';
  private headerItems: TRowContent | TColumnItem = [];
  private bodyItems: TRowContent[] = [];

  constructor(header: TColumnItem) {
    if (!this.isValidTableRow(header)) {
      throw new Error(ERRORS.tableRowIsNotValid);
    }

    let allHeaderRows = '';

    for (const col of header) {
      allHeaderRows = allHeaderRows + this.addRow(col, 'header') + '\n';
    }
    this.headerItems = header;
    this.headerMD = '  <tr>' + '\n' + allHeaderRows + '  </tr>';
  }

  // ===========================================================================

  private isValidTableRow(tableRow: TRowContent | TColumnItem) {
    const onlyValidItems = tableRow.filter((boiler) => cellContentSchema.safeParse(boiler).success);
    const isValidRow = tableRow.length === onlyValidItems.length;
    return isValidRow;
  }

  addBodyRow(body: TRowContent) {
    if (!this.isValidTableRow(body)) {
      throw new Error(ERRORS.tableRowIsNotValid);
    }
    this.bodyItems.push(body);
  }

  private getBodyMd(allBody: TRowContent[], columnToJoinIndex?: number) {
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

  getTable(columnToJoin?: ExtractContent<TColumnItem>[number]) {
    let finalBody = '';

    if (columnToJoin) {
      const allColumns = this.headerItems.map((item) => item.content);
      if (!allColumns.includes(columnToJoin)) {
        throw new Error(ERRORS.columnNotFound(columnToJoin, allColumns.join(', ')));
      }

      const columnIndex = this.headerItems.findIndex((item) => item.content === columnToJoin);
      finalBody = this.getBodyMd(this.bodyItems, columnIndex);
    } else {
      finalBody = this.getBodyMd(this.bodyItems);
    }

    const markdownTable = '<table>' + '\n' + this.headerMD + '\n' + finalBody + '\n' + '</table>';
    return markdownTable;
  }

  private addRow(col: TCellContent, type: 'header' | 'body', options?: { quantity?: number; comment?: true }) {
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
