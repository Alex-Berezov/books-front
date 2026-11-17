import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';
import {
  getPublicAudioChapters,
  AUDIO_CHAPTERS_PAGE_LIMIT,
  getPublicAudioChaptersForPage,
  recordView,
} from '@/api/endpoints/public-audio';
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/constants/cache';
import { server } from '../../msw/server';

describe('public audio endpoints', () => {
  describe('getPublicAudioChapters', () => {
    it('requests /versions/:id/audio-chapters with default pagination and returns the list response', async () => {
      let seenUrl: string | null = null;
      server.use(
        http.get('http://localhost:5000/api/versions/:versionId/audio-chapters', ({ request }) => {
          seenUrl = request.url;
          return HttpResponse.json({
            items: [],
            total: 0,
            page: 1,
            limit: 100,
          });
        })
      );

      const result = await getPublicAudioChapters('ver-123');

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 100 });
      expect(seenUrl).toContain('/versions/ver-123/audio-chapters');
      expect(seenUrl).toContain('page=1');
      expect(seenUrl).toContain('limit=100');
    });

    /**
     * LEGACY-369: режим кэша — часть поведения функции. Статический сторож
     * `publicCacheMode.test.ts` читает исходник и зеленеет на любых словах
     * `next:`/`revalidate:` в блоке вызова, значения он не сверяет; здесь проверяется,
     * что в `httpGet` уходит именно шаг публичного чтения, а не, скажем, `revalidate: 0`.
     * msw для этого не годится — опции Next до сервера не доезжают, поэтому мок слоя.
     */
    it('передаёт шаг ревалидации публичного чтения', async () => {
      vi.resetModules();
      const httpGet = vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
      vi.doMock('@/lib/http', () => ({
        httpGet,
        buildLangPath: (l: string, p: string) => `/${l}${p}`,
      }));

      const { getPublicAudioChapters: fresh } = await import('@/api/endpoints/public-audio');
      await fresh('ver-123');

      expect(httpGet.mock.calls[0][1]).toEqual(
        expect.objectContaining({ next: { revalidate: PUBLIC_REVALIDATE_SECONDS } })
      );
      vi.doUnmock('@/lib/http');
      vi.resetModules();
    });

    it('forwards custom page/limit params', async () => {
      let seenUrl: string | null = null;
      server.use(
        http.get('http://localhost:5000/api/versions/:versionId/audio-chapters', ({ request }) => {
          seenUrl = request.url;
          return HttpResponse.json({ items: [], total: 0, page: 2, limit: 25 });
        })
      );

      await getPublicAudioChapters('ver-123', { page: 2, limit: 25 });

      expect(seenUrl).toContain('page=2');
      expect(seenUrl).toContain('limit=25');
    });
  });

  describe('recordView', () => {
    it('POSTs { bookVersionId, source } to /views with source="audio"', async () => {
      let seenBody: unknown = null;
      server.use(
        http.post('http://localhost:5000/api/views', async ({ request }) => {
          seenBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        })
      );

      await recordView({ bookVersionId: 'ver-123', source: 'audio' });

      expect(seenBody).toEqual({ bookVersionId: 'ver-123', source: 'audio' });
    });
  });
});

describe('getPublicAudioChaptersForPage (серверная выборка мира книги, F08-3b)', () => {
  const chapter = (n: number) => ({ id: `a${n}`, number: n });

  // 🔴 Плеер грузит только первую страницу (`usePublicAudioChapters` без параметров): ссылки
  // «Слушать» берут тот же набор, иначе ссылка на главу 101+ открыла бы плеер на главе 1.
  it('страна «неизвестна» (XX) и тот же набор, что у плеера: одна страница, тот же limit', async () => {
    const seen: { page: string | null; limit: string | null; country: string | null }[] = [];
    server.use(
      http.get('http://localhost:5000/api/versions/:versionId/audio-chapters', ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page'));
        seen.push({
          page: url.searchParams.get('page'),
          limit: url.searchParams.get('limit'),
          country: request.headers.get('X-Visitor-Country'),
        });
        const items =
          page === 1
            ? Array.from({ length: 100 }, (_, i) => chapter(i + 1))
            : [chapter(101), chapter(102)];
        return HttpResponse.json({ items, total: 102, page, limit: 100 });
      })
    );

    const items = await getPublicAudioChaptersForPage('ver-1');
    await getPublicAudioChapters('ver-1');

    expect(items).toHaveLength(AUDIO_CHAPTERS_PAGE_LIMIT);
    expect(items.at(-1)?.number).toBe(100);
    expect(seen).toEqual([
      { page: '1', limit: String(AUDIO_CHAPTERS_PAGE_LIMIT), country: 'XX' },
      { page: '1', limit: String(AUDIO_CHAPTERS_PAGE_LIMIT), country: null },
    ]);
  });

  it('передаёт шаг ревалидации публичного чтения', async () => {
    vi.resetModules();
    const httpGet = vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    vi.doMock('@/lib/http', () => ({
      httpGet,
      buildLangPath: (l: string, p: string) => `/${l}${p}`,
    }));

    const { getPublicAudioChaptersForPage: fresh } = await import('@/api/endpoints/public-audio');
    await fresh('ver-1');

    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(httpGet.mock.calls[0][1]).toEqual(
      expect.objectContaining({ next: { revalidate: PUBLIC_REVALIDATE_SECONDS } })
    );
    vi.doUnmock('@/lib/http');
    vi.resetModules();
  });
});
