import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getPublicBookWorld, getPublicBookWorldEntity } from '@/api/endpoints/public';
import { ApiError } from '@/types/api';
import type { BookWorldEntityResponse } from '@/types/api-schema';
import { server } from '../../msw/server';

/**
 * Серверное чтение мира книги для `/{lang}/book/{slug}/wiki[/{key}]` (F08-3b): анонимно и со страной
 * «неизвестна», как анализ; 404 - страницы нет, и это ошибка с кодом 404 (её разбирает страница).
 */
describe('getPublicBookWorld и getPublicBookWorldEntity', () => {
  it('список: без токена, страна XX, отдаёт тело как есть', async () => {
    let authorization: string | null = 'not-seen';
    let country: string | null = null;
    server.use(
      http.get('http://localhost:5000/api/versions/:versionId/world', ({ request }) => {
        authorization = request.headers.get('authorization');
        country = request.headers.get('x-visitor-country');
        return HttpResponse.json({ language: 'en', alternates: [], entities: [] });
      })
    );

    expect(await getPublicBookWorld('ver-1')).toEqual({
      language: 'en',
      alternates: [],
      entities: [],
    });
    expect(authorization).toBeNull();
    expect(country).toBe('XX');
  });

  it('сущность: ключ уходит в путь, страна XX, без токена', async () => {
    let url = '';
    let country: string | null = null;
    let authorization: string | null = 'not-seen';
    server.use(
      http.get('http://localhost:5000/api/versions/:versionId/world/:key', ({ request }) => {
        url = new URL(request.url).pathname;
        country = request.headers.get('x-visitor-country');
        authorization = request.headers.get('authorization');
        // Ответ - по рукописному типу (F08-11a): поле `image` и его форма сверяются `tsc`.
        return HttpResponse.json({
          language: 'en',
          chapterNumbers: [1],
          entity: {} as BookWorldEntityResponse['entity'],
          alternates: [],
          image: { url: 'https://media.example/illustrations/a.png', width: 1536, height: null },
        } satisfies BookWorldEntityResponse);
      })
    );

    const res = await getPublicBookWorldEntity('ver-1', 'anna-lark');

    // F08-11a: принятая иллюстрация доходит как пришла, размер без заголовка - null.
    expect(res.image).toEqual({
      url: 'https://media.example/illustrations/a.png',
      width: 1536,
      height: null,
    });

    expect(url).toBe('/api/versions/ver-1/world/anna-lark');
    expect(country).toBe('XX');
    expect(authorization).toBeNull();
  });

  it('404 - ошибка со статусом 404', async () => {
    server.use(
      http.get('http://localhost:5000/api/versions/:versionId/world/:key', () =>
        HttpResponse.json({ statusCode: 404, message: 'nope' }, { status: 404 })
      )
    );
    await expect(getPublicBookWorldEntity('ver-1', 'x')).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(getPublicBookWorldEntity('ver-1', 'x')).rejects.toBeInstanceOf(ApiError);
  });
});
