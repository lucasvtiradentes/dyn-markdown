import { ERRORS } from '../constants/errors';
import { cellContentSchema, TCellContent, TRowContent } from '../constants/schemas';

type WithContent<T> = T extends { content: infer U } ? U : never;
type ExtractContent<T extends readonly any[]> = { [K in keyof T]: WithContent<T[K]> };

const ROW_TYPE = {
  body: 'body',
  header: 'header'
} as const;

export default class MarkdownTable<TColumnItem extends ReadonlyArray<TCellContent>> {
  #headerMD = '';
  #headerItems: TColumnItem;
  #bodyItems: TRowContent[] = [];

  constructor(header: TColumnItem) {
    if (!this.#isValidTableRow(header)) {
      throw new Error(ERRORS.tableRowIsNotValid);
    }

    let allHeaderRows = '';

    for (const col of header) {
      allHeaderRows = allHeaderRows + this.#addRow(col, ROW_TYPE.header) + '\n';
    }
    this.#headerItems = header;
    this.#headerMD = '  <tr>' + '\n' + allHeaderRows + '  </tr>';
  }

  // ===========================================================================

  #isValidTableRow(tableRow: TRowContent | TColumnItem) {
    const onlyValidItems = tableRow.filter((boiler) => cellContentSchema.safeParse(boiler).success);
    const isValidRow = tableRow.length === onlyValidItems.length;
    return isValidRow;
  }

  #getBodyMd(allRows: TRowContent[], columnsToJoin?: number[]) {
    let allRowsMD = '';
    const itemsMap = new Map();
    if (columnsToJoin) {
      columnsToJoin.forEach((key) => itemsMap.set(key, []));
    }

    for (const row of allRows) {
      let curRow = '';

      row.forEach((col, colIndex) => {
        const current = itemsMap.get(colIndex);

        if (columnsToJoin !== undefined && columnsToJoin.includes(colIndex)) {
          if (!current.includes(col.content)) {
            const cellCount = allRows.map((item) => item[colIndex]).filter((item) => item?.content === col.content).length;
            itemsMap.set(colIndex, [...current, col.content]);
            curRow = curRow + this.#addRow(col, ROW_TYPE.body, { quantity: cellCount }) + '\n';
          } else {
            curRow = curRow + this.#addRow(col, ROW_TYPE.body, { comment: true }) + '\n';
          }
        } else {
          curRow = curRow + this.#addRow(col, ROW_TYPE.body) + '\n';
        }
      });

      curRow = '  <tr>' + '\n' + curRow + '  </tr>';
      allRowsMD = (allRowsMD === '' ? '' : allRowsMD + '\n') + curRow;
    }

    return allRowsMD;
  }

  #addRow(col: TCellContent, type: keyof typeof ROW_TYPE, options?: { quantity?: number; comment?: true }) {
    const { content, width, align } = col;
    const rowType = type === ROW_TYPE.header ? 'th' : 'td';

    let row = '';
    const spacing = '    ';
    row = (options?.comment ? '' : spacing) + `<${rowType}>${content}</${rowType}>`;

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
      row = `${spacing}<!-- ${row} -->`;
    }

    return row;
  }

  // ===========================================================================

  addBodyRow(body: TRowContent) {
    if (!this.#isValidTableRow(body)) {
      throw new Error(ERRORS.tableRowIsNotValid);
    }
    this.#bodyItems.push(body);
  }

  getTable(columnsToJoin?: ExtractContent<TColumnItem>[number][]) {
    let finalBody = '';

    if (columnsToJoin) {
      const allColumns = this.#headerItems.map((item) => item.content);

      for (const column of columnsToJoin) {
        if (!allColumns.includes(column)) {
          throw new Error(ERRORS.columnNotFound(column, allColumns.join(', ')));
        }
      }

      const columnsToMerge = columnsToJoin.map((columnToJoin) => this.#headerItems.findIndex((header) => header.content === columnToJoin));
      finalBody = this.#getBodyMd(this.#bodyItems, columnsToMerge);
    } else {
      finalBody = this.#getBodyMd(this.#bodyItems);
    }

    const markdownTable = '<table>' + '\n' + this.#headerMD + '\n' + finalBody + '\n' + '</table>';
    return markdownTable;
  }
}
