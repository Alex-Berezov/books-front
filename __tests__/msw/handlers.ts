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
      total: 1,
      page: Number(url.searchParams.get('page') ?? '1'),
      limit: Number(url.searchParams.get('limit') ?? '20'),
    });
  }),

  http.get(`${API_BASE}/admin/rights/lawyer-reviews`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      items: [],
      total: 0,
      page: Number(url.searchParams.get('page') ?? '1'),
      limit: Number(url.searchParams.get('limit') ?? '20'),
    });
  }),

  http.get(`${API_BASE}/admin/rights/intakes/:intakeId/lawyer-reviews`, () =>
    HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 })
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
];
