import { DynMarkdown, MarkdownTable, RowContent, getJson } from '../src/index';

const articlesJson = getJson('./examples/articles.json');
const articlesMarkdown = new DynMarkdown('./examples/articles.md');

const articlesTable = new MarkdownTable();
const headerContent: RowContent[] = [
  { content: 'date', width: 120 },
  { content: 'title', width: 600 },
  { content: 'motivation', width: 300 },
  { content: 'tech', width: 100 }
];

articlesTable.setHeader(headerContent);
articlesJson.forEach((item: any) => {
  const { date, title, motivation, tech } = item;
  const bodyRow: RowContent[] = [
    { content: date, align: 'center' },
    { content: title, align: 'center' },
    { content: motivation, align: 'left' },
    { content: tech.join(', '), align: 'center' }
  ];
  articlesTable.addBodyRow(bodyRow);
});

articlesMarkdown.updateField('NODEJS_UTILITIES', articlesTable.getTable());
articlesMarkdown.updateField('ARTICLES_NUMBER', 'ALL MY ARTICLES (40)');
articlesMarkdown.saveFile();
