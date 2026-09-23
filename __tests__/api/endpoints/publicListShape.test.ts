import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getComments } from '@/api/endpoints/comments';
import {
  getPublicAuthors,
  getPublicBooks,
  getPublicCategories,
  getPublicChapters,
  getPublicTags,
} from '@/api/endpoints/public';
import { server } from '../../msw/server';

const API_BASE = 'http://localhost:5000/api';

const pagination = { page: 1, limit: 5, total: 7, totalPages: 2 };
const row = { id: 'r1' };

/**
 * `LEGACY-378`/`379`: публичные списки приходят и отдаются как `{items, pagination}`.
 * Форму ответа против схемы бэкенда стережёт `check:type-sync` (статически), отказ на живом
 * ответе без массива `items` или числового `pagination.total` — `takeCompletePage`
 * (`__tests__/lib/sitemap/utils.test.ts`). Рантайм-проверки формы в функциях запросов нет
 * сознательно (решение арбитра 24.09.2026). Здесь — что функции отдают тело как есть.
 */
describe('public list endpoints return {items, pagination}', () => {
  const lists: Array<[string, string, () => Promise<unknown>]> = [
    ['books', '/en/books', () => getPublicBooks('en', { page: 1, limit: 5 })],
    [
      'categories',
      '/en/categories',
      () => getPublicCategories('en', 'genre', { page: 1, limit: 5 }),
    ],
    ['tags', '/en/tags', () => getPublicTags('en', { page: 1, limit: 5 })],
    ['authors', '/en/authors', () => getPublicAuthors('en', { page: 1, limit: 5 })],
  ];

  it.each(lists)('%s', async (_name, path, call) => {
    server.use(
      http.get(`${API_BASE}${path}`, () => HttpResponse.json({ items: [row], pagination }))
    );
    await expect(call()).resolves.toEqual({ items: [row], pagination });
  });

  it('chapters', async () => {
    const chapters = { items: [row], pagination: { page: 1, limit: 1, total: 1, totalPages: 1 } };
    server.use(http.get(`${API_BASE}/versions/v1/chapters`, () => HttpResponse.json(chapters)));
    await expect(getPublicChapters('v1')).resolves.toEqual(chapters);
  });

  it('comments: hasNext lives inside pagination', async () => {
    const body = { items: [row], pagination: { ...pagination, hasNext: true } };
    server.use(http.get(`${API_BASE}/comments`, () => HttpResponse.json(body)));
    await expect(
      getComments({ target: 'version', targetId: 'v1', page: 1, limit: 5 })
    ).resolves.toEqual(body);
  });
});
