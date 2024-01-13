import { existsSync, readFileSync } from 'node:fs';

export function getJson(jsonFile: string) {
  if (!existsSync(jsonFile)) {
    throw new Error(`json file [${jsonFile}] does not exists!`);
  }
  return JSON.parse(readFileSync(jsonFile, 'utf8'));
}
