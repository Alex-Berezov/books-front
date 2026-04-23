import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAudioChapter,
  deleteAudioChapter,
  getAudioChapter,
  getAudioChapters,
  reorderAudioChapters,
  updateAudioChapter,
} from '@/api/endpoints/admin/audioChapters';
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
