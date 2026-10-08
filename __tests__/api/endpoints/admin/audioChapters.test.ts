import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAudioChapter,
  deleteAudioChapter,
  getAllAudioChapters,
  getAudioChapter,
  getAudioChapters,
  reorderAudioChapters,
  updateAudioChapter,
} from '@/api/endpoints/admin/audioChapters';
import { ApiError } from '@/types/api';
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

describe('admin audio chapters endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAudioChapters', () => {
    it('walks every page so the list is not cut at the first 100 (LEGACY-441)', async () => {
      const seenPages: string[] = [];
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          const url = new URL(request.url);
          const page = Number(url.searchParams.get('page'));
          seenPages.push(`${page}:${url.searchParams.get('limit')}`);
          const count = page === 1 ? 100 : 20;
          const items = Array.from({ length: count }, (_, i) => ({
            id: `a${page}-${i}`,
            number: i,
          }));
          return HttpResponse.json({ items, total: 120, page, limit: 100 });
        })
      );

      const result = await getAllAudioChapters('ver-42');

      expect(seenPages).toEqual(['1:100', '2:100']);
      expect(result).toHaveLength(120);
    });

    it('makes one request when everything fits the first page', async () => {
      let calls = 0;
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, () => {
          calls += 1;
          return HttpResponse.json({
            items: [{ id: 'a1', number: 1 }],
            total: 1,
            page: 1,
            limit: 100,
          });
        })
      );

      const result = await getAllAudioChapters('ver-42');

      expect(calls).toBe(1);
      expect(result).toHaveLength(1);
    });

    it('fails instead of a short list when a chapter was deleted mid-walk', async () => {
      const seenPages: number[] = [];
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page'));
          seenPages.push(page);
          const items =
            page === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, number: i })) : [];
          return HttpResponse.json({ items, total: 150, page, limit: 100 });
        })
      );

      await expect(getAllAudioChapters('ver-42')).rejects.toThrow(
        'the audio chapter list could not be loaded in full'
      );
      expect(seenPages).toContain(2);
    });

    it('drops a chapter repeated by a shifted page', async () => {
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page'));
          // A chapter added mid-walk pushes a99 from page 1 onto page 2.
          const items =
            page === 1
              ? Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, number: i }))
              : [
                  { id: 'a99', number: 99 },
                  { id: 'a100', number: 100 },
                ];
          return HttpResponse.json({ items, total: 101, page, limit: 100 });
        })
      );

      const result = await getAllAudioChapters('ver-42');

      expect(result.map((c) => c.id)).toEqual([
        ...Array.from({ length: 100 }, (_, i) => `a${i}`),
        'a100',
      ]);
    });

    it('fails when a repeated row hides a missing one', async () => {
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page'));
          // An insert repeats a99 on page 2 while a delete drops a100: the count still matches.
          const items =
            page === 1
              ? Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, number: i }))
              : [{ id: 'a99', number: 99 }];
          return HttpResponse.json({ items, total: 101, page, limit: 100 });
        })
      );

      await expect(getAllAudioChapters('ver-42')).rejects.toThrow(
        'the audio chapter list could not be loaded in full'
      );
    });

    it('fetches the last chapter when an insert repeats one across pages', async () => {
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page'));
          // 150 chapters; an insert after page 1 pushes a99 onto page 2 and a149 to index 150.
          const ids =
            page === 1
              ? Array.from({ length: 100 }, (_, i) => i)
              : Array.from({ length: 51 }, (_, i) => 99 + i);
          const items = ids.map((i) => ({ id: `a${i}`, number: i }));
          return HttpResponse.json({ items, total: 150, page, limit: 100 });
        })
      );

      const result = await getAllAudioChapters('ver-42');

      expect(result).toHaveLength(150);
      expect(Math.max(...result.map((c) => c.number))).toBe(149);
    });

    it('retries a page once before giving up', async () => {
      let page2Calls = 0;
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page'));
          if (page === 2) {
            page2Calls += 1;
            if (page2Calls === 1)
              return HttpResponse.json({ message: 'slow down' }, { status: 429 });
          }
          const ids = page === 1 ? 100 : 20;
          const items = Array.from({ length: ids }, (_, i) => ({ id: `a${page}-${i}`, number: i }));
          return HttpResponse.json({ items, total: 120, page, limit: 100 });
        })
      );

      const result = await getAllAudioChapters('ver-42');

      expect(page2Calls).toBe(2);
      expect(result).toHaveLength(120);
    });

    it('fails as a whole when a later page fails, instead of a cut list', async () => {
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page'));
          if (page === 2) return HttpResponse.json({ message: 'boom' }, { status: 500 });
          const items = Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, number: i }));
          return HttpResponse.json({ items, total: 120, page, limit: 100 });
        })
      );

      const failure = getAllAudioChapters('ver-42');
      // A server failure keeps its own status: it is not "the list changed".
      await expect(failure).rejects.toBeInstanceOf(ApiError);
      await expect(failure).rejects.toMatchObject({ statusCode: 500 });
    });

    it('keeps a network failure as it is, not as a changed list', async () => {
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page'));
          if (page === 2) return HttpResponse.error();
          const items = Array.from({ length: 100 }, (_, i) => ({ id: `a${i}`, number: i }));
          return HttpResponse.json({ items, total: 120, page, limit: 100 });
        })
      );

      const failure = getAllAudioChapters('ver-42');
      await expect(failure).rejects.toThrow();
      await expect(failure).rejects.not.toThrow(
        'the audio chapter list could not be loaded in full'
      );
    });
  });

  describe('getAudioChapters', () => {
    it('hits /admin/versions/:id/audio-chapters with default pagination', async () => {
      let seenUrl = '';
      let seenAuth: string | null = null;
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          seenUrl = request.url;
          seenAuth = request.headers.get('authorization');
          return HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 });
        })
      );

      const result = await getAudioChapters('ver-42');

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 50 });
      expect(seenUrl).toContain('/admin/versions/ver-42/audio-chapters');
      expect(seenUrl).toContain('page=1');
      expect(seenUrl).toContain('limit=50');
      expect(seenAuth).toBe('Bearer test-token');
    });

    it('forwards custom page/limit', async () => {
      let seenUrl = '';
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, ({ request }) => {
          seenUrl = request.url;
          return HttpResponse.json({ items: [], total: 0, page: 3, limit: 10 });
        })
      );

      await getAudioChapters('ver-42', { page: 3, limit: 10 });

      expect(seenUrl).toContain('page=3');
      expect(seenUrl).toContain('limit=10');
    });
  });

  describe('getAudioChapter', () => {
    it('hits /admin/audio-chapters/:id', async () => {
      let seenUrl = '';
      server.use(
        http.get(`${API_BASE}/admin/audio-chapters/:id`, ({ request, params }) => {
          seenUrl = request.url;
          return HttpResponse.json({
            id: params.id,
            bookVersionId: 'ver-1',
            number: 1,
            title: 'X',
            audioUrl: 'https://x/y.mp3',
            mediaId: null,
            duration: 10,
            description: null,
            transcript: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          });
        })
      );

      const result = await getAudioChapter('ac-1');

      expect(result.id).toBe('ac-1');
      expect(seenUrl).toContain('/admin/audio-chapters/ac-1');
    });
  });

  describe('createAudioChapter', () => {
    it('POSTs the full DTO to /versions/:id/audio-chapters', async () => {
      let seenBody: unknown = null;
      let seenPath = '';
      server.use(
        http.post(`${API_BASE}/versions/:id/audio-chapters`, async ({ request }) => {
          seenPath = new URL(request.url).pathname;
          seenBody = await request.json();
          return HttpResponse.json({
            id: 'ac-new',
            bookVersionId: 'ver-1',
            number: 1,
            title: 'New',
            audioUrl: 'https://cdn/x.mp3',
            mediaId: 'm-1',
            duration: 120,
            description: null,
            transcript: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          });
        })
      );

      const result = await createAudioChapter('ver-1', {
        number: 1,
        title: 'New',
        audioUrl: 'https://cdn/x.mp3',
        mediaId: 'm-1',
        duration: 120,
      });

      expect(result.id).toBe('ac-new');
      expect(seenPath).toBe('/api/versions/ver-1/audio-chapters');
      expect(seenBody).toMatchObject({
        number: 1,
        title: 'New',
        audioUrl: 'https://cdn/x.mp3',
        mediaId: 'm-1',
        duration: 120,
      });
    });
  });

  describe('updateAudioChapter', () => {
    it('PATCHes /audio-chapters/:id', async () => {
      let seenBody: unknown = null;
      server.use(
        http.patch(`${API_BASE}/audio-chapters/:id`, async ({ request, params }) => {
          seenBody = await request.json();
          return HttpResponse.json({
            id: params.id,
            bookVersionId: 'ver-1',
            number: 2,
            title: 'Renamed',
            audioUrl: 'https://cdn/x.mp3',
            mediaId: null,
            duration: 60,
            description: null,
            transcript: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z',
          });
        })
      );

      const result = await updateAudioChapter('ac-1', { title: 'Renamed', number: 2 });

      expect(result.title).toBe('Renamed');
      expect(seenBody).toEqual({ title: 'Renamed', number: 2 });
    });
  });

  describe('deleteAudioChapter', () => {
    it('DELETE /audio-chapters/:id returns void on 204', async () => {
      let seenMethod = '';
      let seenPath = '';
      server.use(
        http.delete(`${API_BASE}/audio-chapters/:id`, ({ request }) => {
          seenMethod = request.method;
          seenPath = new URL(request.url).pathname;
          return new HttpResponse(null, { status: 204 });
        })
      );

      await expect(deleteAudioChapter('ac-1')).resolves.toBeUndefined();
      expect(seenMethod).toBe('DELETE');
      expect(seenPath).toBe('/api/audio-chapters/ac-1');
    });
  });

  describe('reorderAudioChapters', () => {
    it('POSTs { audioChapterIds } to /versions/:id/audio-chapters/reorder and preserves order', async () => {
      let seenBody: { audioChapterIds: string[] } | null = null;
      server.use(
        http.post(`${API_BASE}/versions/:id/audio-chapters/reorder`, async ({ request }) => {
          seenBody = (await request.json()) as { audioChapterIds: string[] };
          return HttpResponse.json(
            seenBody.audioChapterIds.map((id, idx) => ({
              id,
              bookVersionId: 'ver-1',
              number: idx + 1,
              title: `C ${idx + 1}`,
              audioUrl: 'https://cdn/x.mp3',
              mediaId: null,
              duration: 1,
              description: null,
              transcript: null,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            }))
          );
        })
      );

      const ids = ['ac-c', 'ac-a', 'ac-b'];
      const result = await reorderAudioChapters('ver-1', { audioChapterIds: ids });

      expect(seenBody).toEqual({ audioChapterIds: ids });
      expect(result.map((c) => c.id)).toEqual(ids);
      expect(result.map((c) => c.number)).toEqual([1, 2, 3]);
    });
  });

  describe('error propagation', () => {
    it('throws ApiError on 4xx', async () => {
      server.use(
        http.get(`${API_BASE}/admin/versions/:id/audio-chapters`, () => {
          return HttpResponse.json({ message: 'Forbidden', error: 'Forbidden' }, { status: 403 });
        })
      );

      await expect(getAudioChapters('ver-x')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
