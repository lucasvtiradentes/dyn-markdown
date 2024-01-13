import { DynMarkdown, MarkdownTable, getJson, TRowContent } from '../src/index';

type TArticleItem = {
  date: string;
  title: string;
  motivation: string;
  tech: string[];
};

const articlesJson: TArticleItem[] = getJson('./examples/articles.json');
const articlesMarkdown = new DynMarkdown('./examples/articles.md');

// TABLE =======================================================================

const articlesTable = new MarkdownTable();
const headerContent: TRowContent = [
  { content: 'date', width: 120 },
  { content: 'title', width: 600 },
  { content: 'motivation', width: 300 },
  { content: 'tech', width: 100 }
];
articlesTable.setHeader(headerContent);

articlesJson.forEach((article) => {
  const { date, title, motivation, tech } = article;
  const bodyRow: TRowContent = [
    { content: date, align: 'center' },
    { content: title, align: 'center' },
    { content: motivation, align: 'left' },
    { content: tech.join(', '), align: 'center' }
  ];
  articlesTable.addBodyRow(bodyRow);
});

// =============================================================================

articlesMarkdown.updateField('LAST_UPDATE_BY', 'javascript ts');
articlesMarkdown.updateField('NODEJS_UTILITIES', articlesTable.getTable('date'));
articlesMarkdown.updateField('ARTICLES_NUMBER', `ALL MY ARTICLES (${articlesJson.length})`);
articlesMarkdown.saveFile();
