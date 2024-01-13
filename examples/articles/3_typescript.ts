import { DynMarkdown, MarkdownTable, getJson, TRowContent } from '../../src/index';

type TArticleItem = {
  date: string;
  title: string;
  motivation: string;
  tech: string[];
};

type TArticleFields = 'LAST_UPDATE_BY' | 'NODEJS_UTILITIES' | 'ARTICLES_NUMBER';
const articlesJson: TArticleItem[] = getJson('./examples/articles/articles.json');
const articlesMarkdown = new DynMarkdown<TArticleFields>('./examples/articles/articles.md');

// TABLE =======================================================================

const headerContent = [
  { content: 'date', width: 120 },
  { content: 'title', width: 600 },
  { content: 'motivation', width: 300 },
  { content: 'tech', width: 100 }
] as const satisfies TRowContent;

const articlesTable = new MarkdownTable(headerContent);

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

// // =============================================================================

articlesMarkdown.updateField('LAST_UPDATE_BY', 'javascript ts');
articlesMarkdown.updateField('NODEJS_UTILITIES', articlesTable.getTable('date'));
// articlesMarkdown.updateField('ARTICLES_NUMBER', `ALL MY ARTICLES (${articlesJson.length})`);
// articlesMarkdown.saveFile();
