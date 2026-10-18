import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getPublicBookAnalysis } from '@/api/endpoints/public';
import { server } from '../../msw/server';

/**
 * Серверное чтение анализа для страницы `/{lang}/book/{slug}/analysis` (F03-2): анонимно и со
 * страной «неизвестна» (`X-Visitor-Country: XX`). Без заголовка бэкенд взял бы страну сервера
 * фронта, и блок окончённой претензии по этой стране закрыл бы кэшируемую страницу для всего мира
 * (решение арбитра `F03 | F03-2`).
 */
describe('getPublicBookAnalysis', () => {
  it('ходит без токена и со страной XX, отдаёт анализ', async () => {
    let authorization: string | null = 'not-seen';
    let country: string | null = null;
    server.use(
      http.get('http://localhost:5000/api/versions/:versionId/analysis', ({ request }) => {
        authorization = request.headers.get('authorization');
        country = request.headers.get('x-visitor-country');
        return HttpResponse.json({ hasCore: true, mainIdea: 'Idea', chapterNumbers: [1] });
      })
    );

    const result = await getPublicBookAnalysis('ver-1');

    expect(result).toMatchObject({ hasCore: true, chapterNumbers: [1] });
    expect(authorization).toBeNull();
    expect(country).toBe('XX');
  });

  it('пустое тело (анализа с ядром нет) - null', async () => {
    server.use(
      http.get(
        'http://localhost:5000/api/versions/:versionId/analysis',
        () => new HttpResponse(null, { status: 200, headers: { 'content-length': '0' } })
      )
    );

    expect(await getPublicBookAnalysis('ver-1')).toBeNull();
  });
});
