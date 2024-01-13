import { existsSync, readFileSync } from 'node:fs';
import { ERRORS } from '../constants/errors';

export function getJson(jsonFile: string) {
  if (!existsSync(jsonFile)) {
    throw new Error(ERRORS.jsonDoesNotExists(jsonFile));
  }

  return JSON.parse(readFileSync(jsonFile, 'utf8'));
}
