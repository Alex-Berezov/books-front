import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  getPublicSummarySection,
  getPublicSummarySections,
  getSummarySectionsSitemap,
} from '@/api/endpoints/public';
import { server } from '../../msw/server';

/**
 * Серверные чтения раздела пересказа и оглавления для `/summary/{n}` и `/summary` (F04-3, `tech.md`
 * §6): анонимно и со страной «неизвестна» (`X-Visitor-Country: XX`). Ответ ложится в общий ISR-кэш:
 * с токеном туда попал бы ответ редактора, без заголовка - ответ по стране сервера фронта (451 →
 * кэшируемый 404 для всего мира).
 */
describe('публичные чтения разделов пересказа', () => {
  const seen = () => ({
    authorization: 'not-seen' as string | null,
    country: null as string | null,
  });

  it('раздел по номеру - без токена и со страной XX', async () => {
    const headers = seen();
    server.use(
      http.get(
        'http://localhost:5000/api/versions/:versionId/summary-sections/:number',
        ({ request, params }) => {
          headers.authorization = request.headers.get('authorization');
          headers.country = request.headers.get('x-visitor-country');
          return HttpResponse.json({
            number: Number(params.number),
            title: 'Part',
            text: '<p>x</p>',
          });
        }
      )
    );

    const result = await getPublicSummarySection('ver-1', 3);

    expect(result).toMatchObject({ number: 3, title: 'Part' });
    expect(headers.authorization).toBeNull();
    expect(headers.country).toBe('XX');
  });

  it('оглавление - без токена и со страной XX', async () => {
    const headers = seen();
    server.use(
      http.get('http://localhost:5000/api/versions/:versionId/summary-sections', ({ request }) => {
        headers.authorization = request.headers.get('authorization');
        headers.country = request.headers.get('x-visitor-country');
        return HttpResponse.json({ sections: [{ number: 1, title: 'Part' }] });
      })
    );

    const result = await getPublicSummarySections('ver-1');

    expect(result.sections).toHaveLength(1);
    expect(headers.authorization).toBeNull();
    expect(headers.country).toBe('XX');
  });

  it('страница карты - путь языка, page и limit, без токена', async () => {
    const seenUrl: { url: URL | null } = { url: null };
    let authorization: string | null = 'not-seen';
    server.use(
      http.get('http://localhost:5000/api/en/summary-sections/sitemap', ({ request }) => {
        seenUrl.url = new URL(request.url);
        authorization = request.headers.get('authorization');
        return HttpResponse.json({
          items: [{ slug: 'a', sections: [{ number: 1, lastmod: '2026-10-01T00:00:00.000Z' }] }],
          pagination: { page: 2, limit: 50, total: 51, totalPages: 2 },
        });
      })
    );

    const result = await getSummarySectionsSitemap('en', 2, 50);

    expect(result.items).toHaveLength(1);
    expect(seenUrl.url?.searchParams.get('page')).toBe('2');
    expect(seenUrl.url?.searchParams.get('limit')).toBe('50');
    expect(authorization).toBeNull();
  });
});
