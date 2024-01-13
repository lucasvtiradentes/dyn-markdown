import { DynMarkdown, MarkdownTable, getJson, TRowContent } from '../src/index';
import { unlinkSync } from 'node:fs';

it('should give an error on open an nonexistent markdown file', () => {
  const nonExistentMarkdownFile = './tests/nonexistent.md';
  expect(() => {
    new DynMarkdown(nonExistentMarkdownFile);
  }).toThrow(`specified file [${nonExistentMarkdownFile}] does not exist`);
});

it('should give an error on open an nonexistent json file', () => {
  const nonExistentJsonFile = './tests/nonexistent.json';
  expect(() => {
    getJson(nonExistentJsonFile);
  }).toThrow(`json file [${nonExistentJsonFile}] does not exists!`);
});

it('should give an error on updating nonexistent field in the markdown file', () => {
  const nonExistentField = 'NONEXISTENT_FIELD';
  expect(() => {
    const exampleMarkdown = new DynMarkdown('./tests/example.md');
    exampleMarkdown.updateField(nonExistentField, `SOME THING`);
    exampleMarkdown.saveFile();
  }).toThrow(`field [${nonExistentField}] was not found in the file!`);
});

it('should give an error on adding a table with a incorrect row format', () => {
  expect(() => {
    new MarkdownTable([
      {
        content: 'header column A',
        align: 'center'
      },
      {
        wrongContent: 'header column B',
        wrongAlign: 'center'
      }
    ] as any);
  }).toThrow(`you provided a invalid table row object, the correct format is an array of the following object type:\n{"content":"cell content","width":200,"align":"center"}`);
});

it('should update a simple field in a new file correctly', () => {
  const newFile = './tests/newFile.md';
  const exampleMarkdown = new DynMarkdown('./tests/example.md');
  exampleMarkdown.updateField('LAST_UPDATE_BY', `SOME THING`);
  const result = exampleMarkdown.saveFile({ path: newFile });
  expect(result).toBeTruthy();
});

it('should throw on overwrite a markdown file without permission', () => {
  const newFile = './tests/newFile.md';
  expect(() => {
    const exampleMarkdown = new DynMarkdown('./tests/example.md');
    exampleMarkdown.updateField('LAST_UPDATE_BY', `SOME THING`);
    exampleMarkdown.saveFile({ path: newFile });
  }).toThrow(`the specified file already exists [${newFile}] and you didnt allow overwriting!`);
  unlinkSync(newFile);
});

it('should read a json and update a markdown table field correctly', () => {
  const newFile = './tests/newFile.md';
  const articlesJson = getJson('./examples/articles/articles.json');
  const exampleMarkdown = new DynMarkdown('./tests/example.md');
  const articlesTable = new MarkdownTable([
    { content: 'date', width: 120 },
    { content: 'title', width: 600 },
    { content: 'motivation', width: 300 },
    { content: 'tech', width: 100 }
  ] as const);

  articlesJson.forEach((item: any) => {
    const { date, title, motivation, tech } = item;
    const bodyRow: TRowContent = [
      { content: date, align: 'center' },
      { content: title, align: 'center' },
      { content: motivation, align: 'left' },
      { content: tech.join(', '), align: 'center' }
    ];
    articlesTable.addBodyRow(bodyRow);
  });

  exampleMarkdown.updateField('NODEJS_UTILITIES', articlesTable.getTable('date'));
  const result = exampleMarkdown.saveFile({ path: newFile });
  expect(result).toBeTruthy();
  unlinkSync(newFile);
});
