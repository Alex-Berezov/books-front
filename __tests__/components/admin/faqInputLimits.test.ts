// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FAQ_ANSWER_MAX_LENGTH, FAQ_QUESTION_MAX_LENGTH } from '@/lib/constants/faq';

// LEGACY-419: бэкенд отвечает 400 на пару FAQ длиннее предела. Предел стоит на самом поле ввода —
// редактор не может набрать больше, чем примет сервер.
const REPO_ROOT = resolve(__dirname, '../../..');

interface SchemaProperty {
  maxLength?: number;
}

// Снимок OpenAPI бэкенда, копия рядом (`yarn check:type-sync`): пределы берутся оттуда, а не из памяти теста.
const schemas = (
  JSON.parse(readFileSync(resolve(REPO_ROOT, 'scripts/type-sync/api-schema.json'), 'utf8')) as {
    components: { schemas: Record<string, { properties: Record<string, SchemaProperty> }> };
  }
).components.schemas;

const FAQ_SCHEMAS = ['FaqItemDto', 'TagFaqDto', 'AuthorFaqDto'];

const EDITORS = [
  'components/admin/authors/AuthorForm/AuthorForm.tsx',
  'components/admin/books/BookForm/DetailInfoSection.tsx',
  'components/admin/categories/CategoryTranslationsModal/TranslationForm.tsx',
  'components/admin/pages/PageForm/sections/BasicInfoSection.tsx',
  'components/admin/tags/TagTranslationsModal/TranslationForm.tsx',
];

describe('поля FAQ в админке ограничены пределом сервера (LEGACY-419)', () => {
  it.each(FAQ_SCHEMAS)('пределы совпадают с maxLength схемы %s', (name) => {
    const properties = schemas[name]?.properties;
    expect(properties, `в снимке нет схемы ${name}`).toBeDefined();

    expect(properties?.question?.maxLength).toBe(FAQ_QUESTION_MAX_LENGTH);
    expect(properties?.answer?.maxLength).toBe(FAQ_ANSWER_MAX_LENGTH);
  });

  it.each(EDITORS)('%s ставит maxLength на вопрос и ответ', (file) => {
    const source = readFileSync(resolve(REPO_ROOT, file), 'utf8');

    expect(source).toContain('maxLength={FAQ_QUESTION_MAX_LENGTH}');
    expect(source).toContain('maxLength={FAQ_ANSWER_MAX_LENGTH}');
  });
});
