import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getChapters } from '@/api/endpoints/admin/chapters';
import { server } from '../../../msw/server';

// Provide a token so httpXxxAuth doesn't try to fetch a real session.
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() =>
    Promise.resolve({ accessToken: 'test-token', user: { id: 'u1' }, expires: '2099-01-01' })
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

describe('admin chapters endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Публичный маршрут отвечает только по опубликованным версиям и на черновике отдаёт
   * `404 Book version not found` — то есть ровно на том состоянии, в котором главы и наполняют.
   */
  it('reads the list from the admin route so drafts are listed too', async () => {
    let seenUrl = '';
    let seenAuth: string | null = null;
    server.use(
      http.get(`${API_BASE}/admin/versions/:id/chapters`, ({ request }) => {
        seenUrl = request.url;
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json([{ id: 'c1', number: 1, title: 'Глава 1', content: '...' }]);
      })
    );

    const result = await getChapters('ver-42');

    expect(result).toHaveLength(1);
    expect(seenUrl).toContain('/admin/versions/ver-42/chapters');
    expect(seenUrl).not.toContain('/api/versions/ver-42/chapters');
    expect(seenAuth).toBe('Bearer test-token');
  });
});
