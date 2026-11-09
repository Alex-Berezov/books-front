import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptAllAnalysisItems,
  acceptAnalysisItem,
  discardAnalysisItem,
  discardAnalysisWriteRun,
  getAnalysisWrite,
  getAnalysisWriteEstimate,
  getAnalysisWriteProposal,
  regenerateAnalysisItem,
  startAnalysisWrite,
} from '@/api/endpoints/admin/analysis-write';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/** Ручки хода «Write Analysis» (F07-3a): пути, методы и тела; снятые маршруты заготовки не зовутся. */
describe('admin analysis run endpoints', () => {
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
      http.get(`${API_BASE}/admin/versions/:id/drafts/analysis_write/estimate`, record),
      http.get(`${API_BASE}/admin/versions/:id/drafts/analysis_write`, record),
      http.post(`${API_BASE}/admin/versions/:id/drafts/analysis_write`, record),
      http.get(`${API_BASE}/admin/content-drafts/:id/items/:index`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/items/:index/:action`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/discard-run`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/accept-all`, record),
      // Маршруты снятой заготовки (решение `F07 | F07-3`, п.3): попадание сюда — ошибка.
      http.post(`${API_BASE}/admin/content-drafts/:id/discard`, record),
      http.get(`${API_BASE}/admin/versions/:id/drafts/analysis`, record)
    );
  });

  it('estimate, latest, start with and without the limit', async () => {
    await getAnalysisWriteEstimate('v1');
    await getAnalysisWrite('v1');
    await startAnalysisWrite('v1', { limitUsd: '2' });
    await startAnalysisWrite('v1', {});
    expect(seen).toEqual([
      {
        method: 'GET',
        path: '/admin/versions/v1/drafts/analysis_write/estimate',
        body: undefined,
      },
      { method: 'GET', path: '/admin/versions/v1/drafts/analysis_write', body: undefined },
      { method: 'POST', path: '/admin/versions/v1/drafts/analysis_write', body: { limitUsd: '2' } },
      { method: 'POST', path: '/admin/versions/v1/drafts/analysis_write', body: {} },
    ]);
  });

  it('Accept carries the print of the shown proposal in expectedPrint (T174, p.2)', async () => {
    await acceptAnalysisItem('d1', 5, 'print-5');
    expect(seen).toEqual([
      {
        method: 'POST',
        path: '/admin/content-drafts/d1/items/5/accept',
        body: { expectedPrint: 'print-5' },
      },
    ]);
  });

  it('proposal content and item actions go to items/:index; the run is discarded by discard-run', async () => {
    await getAnalysisWriteProposal('d1', 4);
    await regenerateAnalysisItem('d1', 3, { remark: 'Less general' });
    await regenerateAnalysisItem('d1', 3, {});
    await acceptAnalysisItem('d1', 0);
    await discardAnalysisItem('d1', 2);
    await discardAnalysisWriteRun('d1');
    await acceptAllAnalysisItems('d1');
    expect(seen).toEqual([
      { method: 'GET', path: '/admin/content-drafts/d1/items/4', body: undefined },
      {
        method: 'POST',
        path: '/admin/content-drafts/d1/items/3/regenerate',
        body: { remark: 'Less general' },
      },
      { method: 'POST', path: '/admin/content-drafts/d1/items/3/regenerate', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/items/0/accept', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/items/2/discard', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/discard-run', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/accept-all', body: {} },
    ]);
  });

  it('ids are encoded: a foreign value does not lead to another endpoint', async () => {
    await getAnalysisWrite('a/../b');
    await discardAnalysisWriteRun('d/../x');
    expect(seen.map(({ path }) => path)).toEqual([
      '/admin/versions/a%2F..%2Fb/drafts/analysis_write',
      '/admin/content-drafts/d%2F..%2Fx/discard-run',
    ]);
  });
});
