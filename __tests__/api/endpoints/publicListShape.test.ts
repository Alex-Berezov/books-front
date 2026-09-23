import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { getChapters } from '@/api/endpoints/admin/chapters';
import { getComments } from '@/api/endpoints/comments';
import {
  getPublicAuthors,
  getPublicBooks,
  getPublicCategories,
  getPublicChapters,
  getPublicTags,
} from '@/api/endpoints/public';
import { ApiError } from '@/types/api';
import { server } from '../../msw/server';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() =>
    Promise.resolve({ accessToken: 'test-token', user: { id: 'u1' }, expires: '2099-01-01' })
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

const pagination = { page: 1, limit: 5, total: 7, totalPages: 2 };
const row = { id: 'r1' };

/**
 * `LEGACY-378`/`379`: публичные списки читаются как `{items, pagination}`.
 * Экраны читают `items` и `pagination.total`; вернись функция к `{data, meta}` —
 * они молча показали бы пустой список.
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

  it.each(lists)('%s: new shape passes through', async (_name, path, call) => {
    server.use(
      http.get(`${API_BASE}${path}`, () => HttpResponse.json({ items: [row], pagination }))
    );
    await expect(call()).resolves.toEqual({ items: [row], pagination });
  });

  // ⚠️ Окно выката `W9`: до тега бэкенд отвечает прежней формой. Снимается вторым коммитом.
  it.each(lists)('%s: rollout window reads {data, meta}', async (_name, path, call) => {
    server.use(
      http.get(`${API_BASE}${path}`, () => HttpResponse.json({ data: [row], meta: pagination }))
    );
    await expect(call()).resolves.toEqual({ items: [row], pagination });
  });

  it('chapters: new shape passes through', async () => {
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

  it('comments: rollout window reads the flat shape', async () => {
    server.use(
      http.get(`${API_BASE}/comments`, () =>
        HttpResponse.json({ items: [row], total: 7, page: 1, limit: 5, hasNext: true })
      )
    );
    await expect(
      getComments({ target: 'version', targetId: 'v1', page: 1, limit: 5 })
    ).resolves.toEqual({ items: [row], pagination: { ...pagination, hasNext: true } });
  });

  // ⚠️ Окно выката `W9`: списки глав до тега отвечают голым массивом.
  it.each([
    ['public', '/versions/v1/chapters', () => getPublicChapters('v1')],
    ['admin', '/admin/versions/v1/chapters', () => getChapters('v1')],
  ])('chapters (%s): rollout window reads the bare array', async (_name, path, call) => {
    server.use(http.get(`${API_BASE}${path}`, () => HttpResponse.json([row, { id: 'r2' }])));
    await expect(call()).resolves.toEqual({
      items: [row, { id: 'r2' }],
      pagination: { page: 1, limit: 2, total: 2, totalPages: 1 },
    });
  });

  // 🔴 Счётчик не выдумывается: индекс карты сайта и `robots` хаба авторов читают
  // отказ как «не знаю», а подставленные `0` или `items.length` — как настоящий ответ.
  it.each([
    ['empty body', () => new HttpResponse(null, { status: 200 })],
    ['{data} without meta.total', () => HttpResponse.json({ data: [row], meta: {} })],
    ['unknown shape', () => HttpResponse.json({ rows: [row] })],
    ['{items} with an empty pagination', () => HttpResponse.json({ items: [], pagination: {} })],
  ])('books: %s is a rejection, not an invented total', async (_name, reply) => {
    server.use(http.get(`${API_BASE}/en/books`, reply));
    await expect(getPublicBooks('en', { page: 1, limit: 1 })).rejects.toBeInstanceOf(ApiError);
  });

  it('comments: empty or unknown body is an ApiError, not a TypeError', async () => {
    server.use(http.get(`${API_BASE}/comments`, () => new HttpResponse(null, { status: 200 })));
    await expect(
      getComments({ target: 'version', targetId: 'v1', page: 1, limit: 5 })
    ).rejects.toBeInstanceOf(ApiError);
    server.use(http.get(`${API_BASE}/comments`, () => HttpResponse.json({ rows: [] })));
    await expect(
      getComments({ target: 'version', targetId: 'v1', page: 1, limit: 5 })
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});
