import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAutoTextRead,
  markAutoTextRead,
  unmarkAutoTextRead,
} from '@/api/endpoints/admin/auto-text-read';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/** Ручки отметки «прочитано» (T184): пути и методы по виду хода. */
describe('admin auto-text read endpoints', () => {
  const seen: Array<{ method: string; path: string; body: unknown }> = [];

  beforeEach(() => {
    seen.length = 0;
    const route = `${API_BASE}/admin/versions/:id/drafts/:kind/read`;
    const record = async ({ request }: { request: Request }) => {
      const text = await request.text();
      seen.push({
        method: request.method,
        path: new URL(request.url).pathname.replace('/api', ''),
        body: text ? (JSON.parse(text) as unknown) : undefined,
      });
      return request.method === 'DELETE'
        ? new HttpResponse(null, { status: 204 })
        : HttpResponse.json({ autoTextAt: null, readAt: null, readById: null, read: true });
    };
    server.use(http.get(route, record), http.post(route, record), http.delete(route, record));
  });

  it('reads, marks and unmarks by version and run kind', async () => {
    await expect(getAutoTextRead('v 1', 'summary_write')).resolves.toEqual({
      autoTextAt: null,
      readAt: null,
      readById: null,
      read: true,
    });
    await markAutoTextRead('v1', 'analysis_write', { autoTextAt: '2026-11-12T10:00:00.000Z' });
    await expect(unmarkAutoTextRead('v1', 'summary_write')).resolves.toBeUndefined();

    expect(seen).toEqual([
      { method: 'GET', path: '/admin/versions/v%201/drafts/summary_write/read', body: undefined },
      {
        method: 'POST',
        path: '/admin/versions/v1/drafts/analysis_write/read',
        body: { autoTextAt: '2026-11-12T10:00:00.000Z' },
      },
      { method: 'DELETE', path: '/admin/versions/v1/drafts/summary_write/read', body: undefined },
    ]);
  });
});
