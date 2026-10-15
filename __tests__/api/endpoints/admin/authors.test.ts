import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkAuthorSlug,
  getAuthorById,
  getAuthorPromptInputs,
  getAuthors,
} from '@/api/endpoints/admin/authors';
import { MSW_PROXY_SESSION_TOKEN } from '../../../msw/handlers';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check; the token itself is set
// by the server proxy (the MSW stub stands in for it), not by the browser (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
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
          items: [],
          pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
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
          items: [],
          pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
        });
      })
    );

    await getAuthors({ limit: 30 });

    expect(new URL(seenUrl).searchParams.has('q')).toBe(false);
  });

  it('читает автора по id админским маршрутом и через прокси', async () => {
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
    // Токен ставит серверный прокси из сессии, браузер его не шлёт (`LEGACY-465`): заглушка
    // прокси отказывает без её заголовка и на токене из браузера.
    expect(seenAuth).toBe(`Bearer ${MSW_PROXY_SESSION_TOKEN}`);
  });

  /**
   * `LEGACY-215`. Слаг автора уникален в паре `(language, slug)`, и бэкенд с 08.09.2026
   * требует `lang` обязательным — без него 400. Проверяется именно построение запроса:
   * пропадёт параметр — проверка слага начнёт отвечать отказом на каждый ввод, а `catch`
   * в форме выдаст непроверенный слаг за свободный.
   */
  it('шлёт язык обязательным параметром lang', async () => {
    let seenUrl = '';
    server.use(
      http.get(`${API_BASE}/admin/authors/check-slug`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ exists: false });
      })
    );

    await checkAuthorSlug('leo-tolstoy', 'ru', 'author-1');

    const params = new URL(seenUrl).searchParams;
    expect(params.get('slug')).toBe('leo-tolstoy');
    expect(params.get('lang')).toBe('ru');
    expect(params.get('excludeId')).toBe('author-1');
  });

  // F02-2: «Вводные для промпта» — GET по id автора, с авторизацией через прокси.
  it('getAuthorPromptInputs: GET /admin/authors/:id/prompt-inputs', async () => {
    let seen = { method: '', path: '', auth: '' };
    server.use(
      http.all(`${API_BASE}/admin/authors/:id/prompt-inputs`, ({ request }) => {
        seen = {
          method: request.method,
          path: new URL(request.url).pathname,
          auth: request.headers.get('authorization') ?? '',
        };
        return HttpResponse.json({
          id: 'a-1',
          birthDate: null,
          deathDate: null,
          names: [],
          books: [],
          authors: [],
          authorsTruncated: false,
        });
      })
    );

    const result = await getAuthorPromptInputs('a-1');

    expect(seen.method).toBe('GET');
    expect(seen.path).toBe('/api/admin/authors/a-1/prompt-inputs');
    expect(seen.auth).toBe(`Bearer ${MSW_PROXY_SESSION_TOKEN}`);
    expect(result.authorsTruncated).toBe(false);
  });
});
