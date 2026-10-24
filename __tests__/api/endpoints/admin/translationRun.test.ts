import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelTranslationRun,
  getBookTranslationRuns,
  getTranslationRun,
  getTranslationRunReport,
  getTranslationSource,
  getTranslationRunEstimate,
  pauseTranslationRun,
  resumeTranslationRun,
  startTranslationRun,
} from '@/api/endpoints/admin/translation';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/**
 * Ручки запуска перевода (F05-7): пауза, «продолжить» и отмена шлют каждая свою ручку запуска,
 * «продолжить» несёт новый лимит и модель этапа; оценка — языки повторяющимся параметром.
 */
describe('admin translation run endpoints', () => {
  const seen: Array<{ method: string; path: string; search: string; body: unknown }> = [];

  beforeEach(() => {
    seen.length = 0;
    const record = async ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      const text = await request.text();
      seen.push({
        method: request.method,
        path: url.pathname.replace('/api', ''),
        search: url.search,
        body: text ? (JSON.parse(text) as unknown) : undefined,
      });
      return HttpResponse.json({});
    };
    server.use(
      http.get(`${API_BASE}/admin/versions/:id/translation-runs/estimate`, record),
      http.post(`${API_BASE}/admin/versions/:id/translation-runs`, record),
      http.post(`${API_BASE}/admin/translation-runs/:id/pause`, record),
      http.post(`${API_BASE}/admin/translation-runs/:id/resume`, record),
      http.post(`${API_BASE}/admin/translation-runs/:id/cancel`, record),
      http.get(`${API_BASE}/admin/versions/:id/translation-source`, record),
      http.get(`${API_BASE}/admin/books/:bookId/translation-runs`, record),
      http.get(`${API_BASE}/admin/translation-runs/:id`, record),
      http.get(`${API_BASE}/admin/translation-runs/:id/report`, record)
    );
  });

  it('пауза, продолжить и отмена — каждая своя ручка запуска', async () => {
    await pauseTranslationRun('r1');
    await resumeTranslationRun('r1', { limitUsd: '12.5' });
    await resumeTranslationRun('r1', { stageModels: { check_semantic: 'x/model' } });
    await cancelTranslationRun('r1');

    expect(seen.map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      { method: 'POST', path: '/admin/translation-runs/r1/pause', body: undefined },
      { method: 'POST', path: '/admin/translation-runs/r1/resume', body: { limitUsd: '12.5' } },
      {
        method: 'POST',
        path: '/admin/translation-runs/r1/resume',
        body: { stageModels: { check_semantic: 'x/model' } },
      },
      { method: 'POST', path: '/admin/translation-runs/r1/cancel', body: undefined },
    ]);
  });

  it('оценка — языки повторяющимся параметром и модель перевода; старт — тело выбора', async () => {
    await getTranslationRunEstimate('v1', { languages: ['es', 'fr'], translateModel: 'a/b' });
    await startTranslationRun('v1', { languages: ['es'], limitUsd: '3' });

    expect(seen[0]).toMatchObject({
      method: 'GET',
      path: '/admin/versions/v1/translation-runs/estimate',
      search: '?languages=es&languages=fr&translateModel=a%2Fb',
    });
    expect(seen[1]).toMatchObject({
      method: 'POST',
      path: '/admin/versions/v1/translation-runs',
      body: { languages: ['es'], limitUsd: '3' },
    });
  });

  it('исходник, ход и отчёт — GET своих путей', async () => {
    await getTranslationSource('v1');
    await getTranslationRun('r1');
    await getTranslationRunReport('r1');
    await getTranslationRunEstimate('v1', { languages: ['ru'] });

    expect(seen.map(({ method, path, search }) => `${method} ${path}${search}`)).toEqual([
      'GET /admin/versions/v1/translation-source',
      'GET /admin/translation-runs/r1',
      'GET /admin/translation-runs/r1/report',
      'GET /admin/versions/v1/translation-runs/estimate?languages=ru',
    ]);
  });

  it('запуски книги — фильтры версии и незавершённых в query, без них — только страница', async () => {
    await getBookTranslationRuns('b1');
    await getBookTranslationRuns('b1', { bookVersionId: 'v1', active: true });
    await getBookTranslationRuns('b1', { bookVersionId: 'v1', limit: 1 });

    expect(seen.map(({ path, search }) => `${path}${search}`)).toEqual([
      '/admin/books/b1/translation-runs?page=1&limit=10',
      '/admin/books/b1/translation-runs?page=1&limit=10&bookVersionId=v1&active=true',
      '/admin/books/b1/translation-runs?page=1&limit=1&bookVersionId=v1',
    ]);
  });
});
