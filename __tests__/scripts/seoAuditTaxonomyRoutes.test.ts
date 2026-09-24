// @vitest-environment node
/**
 * Ночной аудит (`scripts/seo-audit.mjs`, правило 7.7) собирает термины таксономии
 * с публичного API. 23.09.2026 безъязыкие `GET /categories` и `GET /tags` сняли
 * (`LEGACY-387`), аудит продолжал ходить туда, получал 404 и каждую ночь краснел
 * INCONCLUSIVE с нулём терминов. Сторож: каждый адрес, который строит аудит, обязан
 * быть живым GET-маршрутом в снимке схемы бэкенда - тем же, что стережёт `check:type-sync`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import * as verdict from '@/scripts/lib/taxonomy-verdict.mjs';

const taxonomyListUrl = verdict.taxonomyListUrl as (
  apiBase: string,
  lang: string,
  type: string,
  page: number,
  limit: number
) => string;

const schema = JSON.parse(
  readFileSync(join(process.cwd(), 'scripts/type-sync/api-schema.json'), 'utf8')
) as { paths: Record<string, Record<string, unknown>> };

const API_BASE = 'https://api.example.test/api';
const LANGS = ['en', 'es', 'fr', 'pt', 'ru'];
const TYPES = ['category', 'genre', 'collection', 'tag'];

const toSchemaPath = (url: string, lang: string): string =>
  new URL(url).pathname.replace(/^\/api/, '').replace(`/${lang}/`, '/{lang}/');

describe('seo-audit: список терминов ходит в живой маршрут (LEGACY-387)', () => {
  it.each(TYPES)('%s: каждый язык - GET-маршрут из снимка схемы', (type) => {
    for (const lang of LANGS) {
      const url = taxonomyListUrl(API_BASE, lang, type, 1, 100);
      const path = toSchemaPath(url, lang);
      expect(schema.paths[path]?.get, `${url} → ${path}`).toBeDefined();
    }
  });

  it('сам аудит собирает адреса к API только через taxonomyListUrl', () => {
    // Скрипт исполняется при импорте, поэтому связь «скрипт → помощник» стережём по исходнику:
    // литерал `${API_BASE}/...` в обход помощника вернул бы класс LEGACY-387 молча.
    const source = readFileSync(join(process.cwd(), 'scripts/seo-audit.mjs'), 'utf8');
    expect(source).toContain('taxonomyListUrl(API_BASE,');
    expect(source.match(/\$\{API_BASE\}/g) ?? []).toEqual([]);
  });

  it('категории передают тип и страницу, теги - только страницу', () => {
    expect(taxonomyListUrl(API_BASE, 'ru', 'genre', 2, 100)).toBe(
      `${API_BASE}/ru/categories?type=genre&page=2&limit=100`
    );
    expect(taxonomyListUrl(API_BASE, 'ru', 'tag', 3, 100)).toBe(
      `${API_BASE}/ru/tags?page=3&limit=100`
    );
  });
});
