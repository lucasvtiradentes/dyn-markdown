import { join } from 'node:path';
import { DynMarkdown, MarkdownTable, TRowContent, getJson } from '../../src/index';

type TAndroidItem = {
  category: string;
  name: string;
  link: string;
  description: string;
};

const FILES = {
  android_apps_json: join(__dirname, './apps.json'),
  android_apps_markdown: join(__dirname, './README.md')
} as const;

const androidMDDynamicFilds = {
  ANDROID_APPS: 'ANDROID_APPS'
} as const;

const androidMD = new DynMarkdown(FILES.android_apps_markdown);

const androidAppsJson: TAndroidItem[] = getJson(FILES.android_apps_json);
const androidAppsTable = new MarkdownTable([
  { content: 'category', width: 120 },
  { content: 'app', width: 600 },
  { content: 'description', width: 300 }
] as const);

androidAppsJson.forEach((item) => {
  const { category, name, link, description } = item;

  const parsedName = `<a href="${link}">${name}</a>`;
  const bodyRow: TRowContent = [
    { content: category, align: 'center' },
    { content: parsedName, align: 'center' },
    { content: description, align: 'center' }
  ];
  androidAppsTable.addBodyRow(bodyRow);
});

androidMD.updateField(androidMDDynamicFilds.ANDROID_APPS, androidAppsTable.getTable('category'));
androidMD.saveFile();
