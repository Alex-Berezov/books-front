import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { getPublicBookSummary } from '@/api/endpoints/public';
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/constants/cache';
import { server } from '../../msw/server';

/**
 * Серверное чтение пересказа для страницы `/{lang}/book/{slug}/summary` (17.10.2026): анонимно
 * (черновик анониму не отдаётся, `LEGACY-090`), с шагом публичной ревалидации, пустое тело - `null`.
 */
describe('getPublicBookSummary', () => {
  it('ходит в /versions/:id/summary без токена и отдаёт пересказ', async () => {
    let authorization: string | null = 'not-seen';
    server.use(
      http.get('http://localhost:5000/api/versions/:versionId/summary', ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ id: 's1', summary: '<p>Plot</p>', updatedAt: '2026-10-12' });
      })
    );

    const result = await getPublicBookSummary('ver-1');

    expect(result).toMatchObject({ id: 's1', summary: '<p>Plot</p>' });
    expect(authorization).toBeNull();
  });

  it('пустое тело (пересказа нет, Nest отдаёт 200 без тела) - null', async () => {
    server.use(
      http.get(
        'http://localhost:5000/api/versions/:versionId/summary',
        () => new HttpResponse(null, { status: 200, headers: { 'content-length': '0' } })
      )
    );

    expect(await getPublicBookSummary('ver-1')).toBeNull();
  });

  // Опции Next до сервера не доезжают, поэтому мок слоя (как в `public-audio.test.ts`).
  it('передаёт шаг ревалидации публичного чтения', async () => {
    vi.resetModules();
    const httpGet = vi.fn().mockResolvedValue(null);
    vi.doMock('@/lib/http', () => ({
      httpGet,
      buildLangPath: (l: string, p: string) => `/${l}${p}`,
    }));

    const { getPublicBookSummary: fresh } = await import('@/api/endpoints/public');
    await fresh('ver-1');

    expect(httpGet.mock.calls[0][0]).toBe('/versions/ver-1/summary');
    expect(httpGet.mock.calls[0][1]).toEqual(
      expect.objectContaining({ next: { revalidate: PUBLIC_REVALIDATE_SECONDS } })
    );
    vi.doUnmock('@/lib/http');
    vi.resetModules();
  });
});
