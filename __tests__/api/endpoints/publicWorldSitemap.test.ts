import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getPublicWorldSitemap } from '@/api/endpoints/public';
import { server } from '../../msw/server';

/** Страница ручки карты мира книги (F08-3b, Q1): путь `/{lang}/world/sitemap`, страница и лимит, без токена. */
describe('getPublicWorldSitemap', () => {
  it('ходит на /{lang}/world/sitemap с page и limit и без токена', async () => {
    let seenUrl: URL | null = null;
    let authorization: string | null = 'not-seen';
    server.use(
      http.get('http://localhost:5000/api/:lang/world/sitemap', ({ request }) => {
        seenUrl = new URL(request.url);
        authorization = request.headers.get('authorization');
        return HttpResponse.json({
          items: [
            { slug: 'hamlet', lastmod: '2026-11-10T08:00:00.000Z', alternates: [], entities: [] },
          ],
          pagination: { page: 2, limit: 50, total: 51, totalPages: 2 },
        });
      })
    );

    const result = await getPublicWorldSitemap('en', 2, 50);

    expect(result.items).toHaveLength(1);
    expect((seenUrl as URL | null)?.pathname).toBe('/api/en/world/sitemap');
    expect((seenUrl as URL | null)?.searchParams.get('page')).toBe('2');
    expect((seenUrl as URL | null)?.searchParams.get('limit')).toBe('50');
    expect(authorization).toBeNull();
  });
});
