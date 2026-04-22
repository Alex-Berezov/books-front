import { http, HttpResponse } from 'msw';
import { describe, it, expect } from 'vitest';
import { getPublicAudioChapters, recordView } from '@/api/endpoints/public-audio';
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
    it('POSTs { versionId, source } to /views with source="audio"', async () => {
      let seenBody: unknown = null;
      server.use(
        http.post('http://localhost:5000/api/views', async ({ request }) => {
          seenBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        })
      );

      await recordView({ versionId: 'ver-123', source: 'audio' });

      expect(seenBody).toEqual({ versionId: 'ver-123', source: 'audio' });
    });
  });
});
