import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptAllSummaryItems,
  acceptSummaryItem,
  discardSummaryItem,
  discardSummaryWriteRun,
  getSummaryWrite,
  getSummaryWriteEstimate,
  regenerateSummaryItem,
  startSummaryWrite,
} from '@/api/endpoints/admin/summary-write';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/** Ручки хода «Write Summary» (F06-2, F06-3): пути, методы и тела. */
describe('admin summary run endpoints', () => {
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
      return HttpResponse.json({});
    };
    server.use(
      http.get(`${API_BASE}/admin/versions/:id/drafts/summary_write/estimate`, record),
      http.get(`${API_BASE}/admin/versions/:id/drafts/summary_write`, record),
      http.post(`${API_BASE}/admin/versions/:id/drafts/summary_write`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/items/:index/:action`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/discard-run`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/accept-all`, record),
      // Ход отбрасывается своей ручкой: попадание сюда — ошибка (решение `F06 | F06-2`, Р9).
      http.post(`${API_BASE}/admin/content-drafts/:id/discard`, record)
    );
  });

  it('estimate, latest, start with and without the limit', async () => {
    await getSummaryWriteEstimate('v1');
    await getSummaryWrite('v1');
    await startSummaryWrite('v1', { limitUsd: '2' });
    await startSummaryWrite('v1', {});
    expect(seen).toEqual([
      {
        method: 'GET',
        path: '/admin/versions/v1/drafts/summary_write/estimate',
        body: undefined,
      },
      { method: 'GET', path: '/admin/versions/v1/drafts/summary_write', body: undefined },
      { method: 'POST', path: '/admin/versions/v1/drafts/summary_write', body: { limitUsd: '2' } },
      { method: 'POST', path: '/admin/versions/v1/drafts/summary_write', body: {} },
    ]);
  });

  it('item actions go to items/:index with their bodies; the run is discarded by discard-run', async () => {
    await regenerateSummaryItem('d1', 3, { remark: 'Less detail' });
    await regenerateSummaryItem('d1', 3, {});
    await acceptSummaryItem('d1', 0, { confirmChapterChange: true });
    await acceptSummaryItem('d1', 0, {});
    await discardSummaryItem('d1', 2);
    await discardSummaryWriteRun('d1');
    await acceptAllSummaryItems('d1');
    expect(seen).toEqual([
      {
        method: 'POST',
        path: '/admin/content-drafts/d1/items/3/regenerate',
        body: { remark: 'Less detail' },
      },
      { method: 'POST', path: '/admin/content-drafts/d1/items/3/regenerate', body: {} },
      {
        method: 'POST',
        path: '/admin/content-drafts/d1/items/0/accept',
        body: { confirmChapterChange: true },
      },
      { method: 'POST', path: '/admin/content-drafts/d1/items/0/accept', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/items/2/discard', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/discard-run', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/accept-all', body: {} },
    ]);
  });

  it('ids are encoded: a foreign value does not lead to another endpoint', async () => {
    await getSummaryWrite('a/../b');
    await discardSummaryWriteRun('d/../x');
    expect(seen.map(({ path }) => path)).toEqual([
      '/admin/versions/a%2F..%2Fb/drafts/summary_write',
      '/admin/content-drafts/d%2F..%2Fx/discard-run',
    ]);
  });
});
