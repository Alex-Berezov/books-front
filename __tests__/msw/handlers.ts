import { http, HttpResponse } from 'msw';
import {
  BACKEND_PROXY_HEADER,
  BACKEND_PROXY_HEADER_VALUE,
  BACKEND_PROXY_PREFIX,
} from '@/lib/backend-proxy.constants';

const API_BASE = 'http://localhost:5000/api';

/** Токен, который заглушка прокси ставит «от сервера» (`LEGACY-465`). */
export const MSW_PROXY_SESSION_TOKEN = 'msw-proxy-session-token';

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

  // --- Rights lawyer workflow (Phase 19) ---
  http.get(`${API_BASE}/admin/rights/lawyers`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      items: [
        {
          id: 'lawyer-1',
          fullName: 'Иванова Анна Сергеевна',
          lawyerType: 'EXTERNAL_COUNSEL',
          organization: 'Юридическое бюро «Право»',
          barId: null,
          email: 'anna@example.com',
          phone: null,
          jurisdictionCodes: ['RU', 'US'],
          specializationRu: null,
          notesRu: null,
          userId: null,
          userEmail: null,
          hasLawyerRole: false,
          isActive: true,
          deactivatedAt: null,
          deactivateReasonRu: null,
          createdAt: '2026-07-01T00:00:00Z',
          updatedAt: '2026-07-01T00:00:00Z',
        },
      ],
      // `LEGACY-177`: обёртка списка сведена к `{items, pagination}`.
      pagination: {
        total: 1,
        page: Number(url.searchParams.get('page') ?? '1'),
        limit: Number(url.searchParams.get('limit') ?? '20'),
        totalPages: 1,
      },
    });
  }),

  http.get(`${API_BASE}/admin/rights/lawyer-reviews`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      items: [],
      pagination: {
        total: 0,
        page: Number(url.searchParams.get('page') ?? '1'),
        limit: Number(url.searchParams.get('limit') ?? '20'),
        totalPages: 0,
      },
    });
  }),

  http.get(`${API_BASE}/admin/rights/intakes/:intakeId/lawyer-reviews`, () =>
    HttpResponse.json({ items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } })
  ),

  http.get(`${API_BASE}/admin/rights/profiles/:profileId/risk-assessment`, ({ params }) =>
    HttpResponse.json({
      rightsProfileId: (params as { profileId: string }).profileId,
      riskLevel: 'LOW',
      factors: [],
      lawyerReviewRequired: false,
      blockApprovalEnabled: true,
      minRiskLevel: 'HIGH',
      assessedAt: '2026-07-31T10:00:00Z',
      currentLawyerReview: null,
      explicitLawyerRequest: false,
      suggestedTrigger: 'HIGH_RISK_POLICY',
      lawyerApproved: false,
      lawyerApprovedAt: null,
      lawyerApprovedLawyerName: null,
      lawyerOpinionValidUntil: null,
    })
  ),

  http.get(`${API_BASE}/admin/versions/:versionId/lawyer-review`, ({ params }) =>
    HttpResponse.json({
      versionId: (params as { versionId: string }).versionId,
      bookId: null,
      rightsProfileId: null,
      blockers: [],
      warnings: [],
      lawyerReviewRequired: false,
      lawyerApproved: false,
      openReviewsCount: 0,
      pendingConditionsCount: 0,
      riskLevel: null,
      lawyerOpinionValidUntil: null,
      reviewIds: [],
      lawyerApprovedAt: null,
      lawyerApprovedLawyerName: null,
      isExpiringSoon: false,
      reviews: [],
      pendingConditions: [],
    })
  ),

  // --- Серверный прокси (`LEGACY-465`) ---
  // Браузерный `http*Auth` ходит на `/api/backend/<путь API>` своего домена. Здесь — заглушка
  // маршрута `app/api/backend/[...path]` с его договором: без заголовка прокси — 403, токен
  // из браузера — 400 (браузер его слать не должен), иначе префикс снимается, токен ставится
  // «сервером» (`MSW_PROXY_SESSION_TOKEN`) и запрос уходит в обработчики выше и в
  // `server.use(...)` тестов. Так тест эндпоинта видит в API токен сессии, только если вызов
  // прошёл через прокси. Остальные проверки маршрута держит `__tests__/app/api/backendProxy.test.ts`.
  // ⚠️ Заглушка строже маршрута в одном и мягче в другом, и это намеренно: на токен из браузера
  // маршрут молча его отбрасывает, а заглушка отвечает 400 — чтобы тест увидел утечку; заголовки
  // вызывающего она пересылает все, а маршрут — белый список (оговорка в `mergeHeaders`).
  http.all(`*${BACKEND_PROXY_PREFIX}/*`, async ({ request }) => {
    if (request.headers.get(BACKEND_PROXY_HEADER) !== BACKEND_PROXY_HEADER_VALUE) {
      return HttpResponse.json(
        { statusCode: 403, message: 'Missing proxy header' },
        { status: 403 }
      );
    }
    if (request.headers.has('authorization')) {
      return HttpResponse.json(
        { statusCode: 400, message: 'Browser sent a token to the proxy' },
        { status: 400 }
      );
    }
    const url = new URL(request.url);
    const target = `${API_BASE}${url.pathname.slice(BACKEND_PROXY_PREFIX.length)}${url.search}`;
    const headers = new Headers(request.headers);
    headers.delete(BACKEND_PROXY_HEADER);
    headers.set('authorization', `Bearer ${MSW_PROXY_SESSION_TOKEN}`);
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    return fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    });
  }),
];
