import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBookSummarySection,
  deleteBookSummarySection,
  getBookSummarySection,
  getBookSummarySections,
  reorderBookSummarySections,
  updateBookSummarySection,
  upsertBookSummaryBrief,
} from '@/api/endpoints/admin/bookSummaries';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/**
 * Ручки разделов пересказа (F04-1, `tech.md` §4): метод, адрес и тело. Удаление — `POST …/delete`
 * с телом, а не `DELETE` (`httpDelete` тела не несёт); раздел адресуется `id`, а не номером.
 */
describe('admin summary sections endpoints', () => {
  const seen: Array<{ method: string; path: string; body: unknown }> = [];

  beforeEach(() => {
    seen.length = 0;
    const record = async ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      const text = await request.text();
      seen.push({
        method: request.method,
        path: url.pathname.replace('/api', ''),
        body: text ? (JSON.parse(text) as unknown) : undefined,
      });
      return HttpResponse.json({ sections: [] });
    };
    server.use(
      http.get(`${API_BASE}/versions/:id/summary-sections`, record),
      http.post(`${API_BASE}/versions/:id/summary-sections`, record),
      http.post(`${API_BASE}/versions/:id/summary-sections/delete`, record),
      http.put(`${API_BASE}/versions/:id/summary-sections/order`, record),
      http.put(`${API_BASE}/versions/:id/summary/brief`, record),
      http.get(`${API_BASE}/summary-sections/:sectionId`, record),
      http.put(`${API_BASE}/summary-sections/:sectionId`, record)
    );
  });

  it('очень краткий — PUT …/summary/brief, ключ brief уходит и при null', async () => {
    await upsertBookSummaryBrief('v1', { brief: null });
    expect(seen).toEqual([
      { method: 'PUT', path: '/versions/v1/summary/brief', body: { brief: null } },
    ]);
  });

  it('список и раздел по id — GET', async () => {
    await getBookSummarySections('v1');
    await getBookSummarySection('s1');
    expect(seen.map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /versions/v1/summary-sections',
      'GET /summary-sections/s1',
    ]);
  });

  it('добавление — POST по версии, правка — PUT по id раздела', async () => {
    await createBookSummarySection('v1', { title: 'T', text: '<p>x</p>', readerChapter: null });
    await updateBookSummarySection('s1', {
      title: 'T',
      text: '<p>x</p>',
      readerChapter: 3,
      expectedUpdatedAt: '2026-10-19T10:00:00.000Z',
    });
    expect(seen).toEqual([
      {
        method: 'POST',
        path: '/versions/v1/summary-sections',
        body: { title: 'T', text: '<p>x</p>', readerChapter: null },
      },
      {
        method: 'PUT',
        path: '/summary-sections/s1',
        body: {
          title: 'T',
          text: '<p>x</p>',
          readerChapter: 3,
          expectedUpdatedAt: '2026-10-19T10:00:00.000Z',
        },
      },
    ]);
  });

  it('удаление — POST …/delete с from, перестановка — PUT …/order с from и to', async () => {
    await deleteBookSummarySection('v1', { sectionId: 'b', from: ['a', 'b'] });
    await reorderBookSummarySections('v1', { from: ['a', 'b'], to: ['b', 'a'] });
    expect(seen).toEqual([
      {
        method: 'POST',
        path: '/versions/v1/summary-sections/delete',
        body: { sectionId: 'b', from: ['a', 'b'] },
      },
      {
        method: 'PUT',
        path: '/versions/v1/summary-sections/order',
        body: { from: ['a', 'b'], to: ['b', 'a'] },
      },
    ]);
  });
});
