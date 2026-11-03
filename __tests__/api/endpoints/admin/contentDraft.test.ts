import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discardContentDraft,
  getContentDraft,
  getContentDraftEstimate,
  startContentDraft,
} from '@/api/endpoints/admin/content-draft';
import { buildDossier, getDossierEstimate } from '@/api/endpoints/admin/translation';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/** Ручки заготовки Analysis и перестройки досье (F05-11): пути, методы и тела. */
describe('admin content draft endpoints', () => {
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
      http.get(`${API_BASE}/admin/versions/:id/drafts/:kind/estimate`, record),
      http.get(`${API_BASE}/admin/versions/:id/drafts/:kind`, record),
      http.post(`${API_BASE}/admin/versions/:id/drafts/:kind`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/discard`, record),
      http.get(`${API_BASE}/admin/versions/:id/dossier/estimate`, record),
      http.post(`${API_BASE}/admin/versions/:id/dossier`, record)
    );
  });

  it('estimate, latest, start with the limit, discard', async () => {
    await getContentDraftEstimate('v1', 'analysis');
    await getContentDraft('v1', 'analysis');
    await startContentDraft('v1', 'analysis', { limitUsd: '0.5' });
    await startContentDraft('v1', 'analysis', {});
    await discardContentDraft('d1');
    expect(seen).toEqual([
      {
        method: 'GET',
        path: '/admin/versions/v1/drafts/analysis/estimate',
        body: undefined,
      },
      { method: 'GET', path: '/admin/versions/v1/drafts/analysis', body: undefined },
      {
        method: 'POST',
        path: '/admin/versions/v1/drafts/analysis',
        body: { limitUsd: '0.5' },
      },
      { method: 'POST', path: '/admin/versions/v1/drafts/analysis', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/discard', body: {} },
    ]);
  });

  it('dossier estimate and rebuild: an empty limit is not sent', async () => {
    await getDossierEstimate('v1');
    await buildDossier('v1');
    await buildDossier('v1', '2');
    expect(seen).toEqual([
      { method: 'GET', path: '/admin/versions/v1/dossier/estimate', body: undefined },
      { method: 'POST', path: '/admin/versions/v1/dossier', body: {} },
      { method: 'POST', path: '/admin/versions/v1/dossier', body: { limitUsd: '2' } },
    ]);
  });

  it('the version id is encoded: a foreign value does not lead to another endpoint', async () => {
    await getContentDraft('a/../b', 'analysis');
    await discardContentDraft('d/../x');
    expect(seen.map(({ path }) => path)).toEqual([
      '/admin/versions/a%2F..%2Fb/drafts/analysis',
      '/admin/content-drafts/d%2F..%2Fx/discard',
    ]);
  });
});
