import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthorById, getAuthors } from '@/api/endpoints/admin/authors';
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

/**
 * `LEGACY-352`. Проверяется именно построение запроса: хуки в тестах компонента
 * замоканы целиком, поэтому ни имя query-параметра, ни адрес одиночного чтения
 * там не выполняются ни разу. Переименуй `q` в `query` — форма молча перестанет
 * что-либо находить, и покраснеть должно здесь.
 */
describe('admin authors endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('отдаёт поиск бэкенду параметром q, а не своим именем', async () => {
    let seenUrl = '';
    server.use(
      http.get(`${API_BASE}/admin/authors`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({
          data: [],
          meta: { page: 1, limit: 30, total: 0, totalPages: 0 },
        });
      })
    );

    await getAuthors({ page: 2, limit: 30, search: 'tolstoy' });

    const url = new URL(seenUrl);
    expect(url.pathname).toContain('/admin/authors');
    expect(url.searchParams.get('q')).toBe('tolstoy');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('30');
  });

  it('без поиска q не отправляется вовсе', async () => {
    let seenUrl = '';
    server.use(
      http.get(`${API_BASE}/admin/authors`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({
          data: [],
          meta: { page: 1, limit: 30, total: 0, totalPages: 0 },
        });
      })
    );

    await getAuthors({ limit: 30 });

    expect(new URL(seenUrl).searchParams.has('q')).toBe(false);
  });

  it('читает автора по id админским маршрутом и с токеном', async () => {
    let seenUrl = '';
    let seenAuth: string | null = null;
    server.use(
      http.get(`${API_BASE}/admin/authors/:id`, ({ request }) => {
        seenUrl = request.url;
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ id: 'a-1', slug: 'jane-doe', translations: [] });
      })
    );

    const result = await getAuthorById('a-1');

    expect(result.id).toBe('a-1');
    expect(seenUrl).toContain('/admin/authors/a-1');
    expect(seenAuth).toBe('Bearer test-token');
  });
});
