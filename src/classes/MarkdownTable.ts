import type { CellContent, RowContent } from '../constants/schemas';
import { CellContentSchema } from '../constants/schemas';

const cellContent: CellContent = {
  content: 'cell content',
  width: 200,
  align: 'center'
};

const TABLE_ERRORS = {
  tableRowIsNotValid: `you provided a invalid table row object, the correct format is an array of the following object type:\n${JSON.stringify(cellContent)}`,
  columnNotFound: (column: string, allColumns: string) => `you must specify a valid column to join: [${column}] is not part of [${allColumns}]`
};

export default class MarkdownTable {
  private headerMD = '';
  private headerItems: RowContent = [];
  private bodyItems: RowContent[] = [];

  private isValidTableRow(tableRow: RowContent) {
    const onlyValidItems = tableRow.filter((boiler) => CellContentSchema.safeParse(boiler).success);
    const isValidRow = tableRow.length === onlyValidItems.length;
    return isValidRow;
  }

  setHeader(header: RowContent) {
    if (!this.isValidTableRow(header)) {
      throw new Error(TABLE_ERRORS.tableRowIsNotValid);
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
      throw new Error(TABLE_ERRORS.tableRowIsNotValid);
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
        throw new Error(TABLE_ERRORS.columnNotFound(columnToJoin, allColumns.join(', ')));
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
