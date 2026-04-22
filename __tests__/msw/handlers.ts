import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:5000/api';

export const handlers = [
  // Example handler
  http.get('*/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // --- Audio chapters (public) ---
  http.get(`${API_BASE}/versions/:versionId/audio-chapters`, ({ params, request }) => {
    const { versionId } = params as { versionId: string };
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '100');

    return HttpResponse.json({
      items: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          bookVersionId: versionId,
          number: 1,
          title: 'Chapter 1',
          audioUrl: 'https://cdn.example.com/audio/ch-1.mp3',
          mediaId: null,
          duration: 125,
          description: null,
          transcript: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page,
      limit,
    });
  }),

  // --- Views ---
  http.post(`${API_BASE}/views`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Progress (audio) ---
  http.put(`${API_BASE}/me/progress/:versionId`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
