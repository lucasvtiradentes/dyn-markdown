/* eslint-disable @typescript-eslint/no-var-requires */

const { DynMarkdown, MarkdownTable, getJson } = require('../dist/index.js');

const articlesJson = getJson('./examples/articles.json');
const articlesMarkdown = new DynMarkdown('./examples/articles.md');

const articlesTable = new MarkdownTable();

const headerContent = [
  { content: 'date', width: 120 },
  { content: 'title', width: 600 },
  { content: 'motivation', width: 300 },
  { content: 'tech', width: 100 }
];

articlesTable.setHeader(headerContent);

articlesJson.forEach((item) => {
  const { date, title, motivation, tech } = item;
  const bodyRow = [
    { content: date, align: 'center' },
    { content: title, align: 'center' },
    { content: motivation, align: 'left' },
    { content: tech.join(', '), align: 'center' }
  ];
  articlesTable.addBodyRow(bodyRow);
});

articlesMarkdown.updateField('LAST_UPDATE_BY', 'javascript cjs');
articlesMarkdown.updateField('NODEJS_UTILITIES', articlesTable.getTable('date'));
articlesMarkdown.updateField('ARTICLES_NUMBER', `ALL MY ARTICLES (${articlesJson.length})`);
articlesMarkdown.saveFile();
