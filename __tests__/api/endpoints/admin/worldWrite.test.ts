import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptAllWorldItems,
  acceptWorldItem,
  discardWorldItem,
  discardWorldWriteRun,
  getWorldWrite,
  getWorldWriteEstimate,
  getWorldWriteProposal,
  regenerateWorldItem,
  startWorldWrite,
} from '@/api/endpoints/admin/world-write';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/** Ручки хода «Write World» (F08-4b): пути, методы и тела; решения по блокам — общие ручки content-drafts. */
describe('admin world run endpoints', () => {
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
      http.get(`${API_BASE}/admin/versions/:id/drafts/world_write/estimate`, record),
      http.get(`${API_BASE}/admin/versions/:id/drafts/world_write`, record),
      http.post(`${API_BASE}/admin/versions/:id/drafts/world_write`, record),
      http.get(`${API_BASE}/admin/content-drafts/:id/items/:index`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/items/:index/:action`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/discard-run`, record),
      http.post(`${API_BASE}/admin/content-drafts/:id/accept-all`, record)
    );
  });

  it('estimate, latest, start with and without the limit', async () => {
    await getWorldWriteEstimate('v1');
    await getWorldWrite('v1');
    await startWorldWrite('v1', { limitUsd: '2' });
    await startWorldWrite('v1', {});
    expect(seen).toEqual([
      { method: 'GET', path: '/admin/versions/v1/drafts/world_write/estimate', body: undefined },
      { method: 'GET', path: '/admin/versions/v1/drafts/world_write', body: undefined },
      { method: 'POST', path: '/admin/versions/v1/drafts/world_write', body: { limitUsd: '2' } },
      { method: 'POST', path: '/admin/versions/v1/drafts/world_write', body: {} },
    ]);
  });

  it('Accept carries the print of the shown proposal in expectedPrint; without it the body is empty', async () => {
    await acceptWorldItem('d1', 5, 'print-5');
    await acceptWorldItem('d1', 6);
    expect(seen).toEqual([
      {
        method: 'POST',
        path: '/admin/content-drafts/d1/items/5/accept',
        body: { expectedPrint: 'print-5' },
      },
      { method: 'POST', path: '/admin/content-drafts/d1/items/6/accept', body: {} },
    ]);
  });

  it('proposal content and item actions go to items/:index; the run is discarded by discard-run', async () => {
    await getWorldWriteProposal('d1', 4);
    await regenerateWorldItem('d1', 3, { remark: 'Less general' });
    await regenerateWorldItem('d1', 3, {});
    await discardWorldItem('d1', 2);
    await discardWorldWriteRun('d1');
    await acceptAllWorldItems('d1');
    expect(seen).toEqual([
      { method: 'GET', path: '/admin/content-drafts/d1/items/4', body: undefined },
      {
        method: 'POST',
        path: '/admin/content-drafts/d1/items/3/regenerate',
        body: { remark: 'Less general' },
      },
      { method: 'POST', path: '/admin/content-drafts/d1/items/3/regenerate', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/items/2/discard', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/discard-run', body: {} },
      { method: 'POST', path: '/admin/content-drafts/d1/accept-all', body: {} },
    ]);
  });

  it('the proposal of an analysis run (the route is shared, the form is by kind) is not taken as world content', async () => {
    server.use(
      http.get(`${API_BASE}/admin/content-drafts/:id/items/:index`, () =>
        HttpResponse.json({ characters: null, text: 'analysis', print: 'p' })
      )
    );
    await expect(getWorldWriteProposal('d1', 0)).rejects.toThrow(/analysis run/);
    server.use(
      http.get(`${API_BASE}/admin/content-drafts/:id/items/:index`, () =>
        HttpResponse.json({ aliases: null, text: 'world', print: 'p' })
      )
    );
    await expect(getWorldWriteProposal('d1', 0)).resolves.toMatchObject({ text: 'world' });
  });

  it('ids are encoded: a foreign value does not lead to another endpoint', async () => {
    await getWorldWrite('a/../b');
    await discardWorldWriteRun('d/../x');
    expect(seen.map(({ path }) => path)).toEqual([
      '/admin/versions/a%2F..%2Fb/drafts/world_write',
      '/admin/content-drafts/d%2F..%2Fx/discard-run',
    ]);
  });
});
