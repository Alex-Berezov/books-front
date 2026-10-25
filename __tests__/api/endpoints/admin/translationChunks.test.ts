import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  editTranslationChunk,
  getDossierGlossary,
  getTranslationChunks,
  getVersionDossier,
  retryTranslationChunk,
} from '@/api/endpoints/admin/translation';
import { server } from '../../../msw/server';

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/** Ручки кусков запуска, досье и глоссария (F05-7v): пути, параметры и тела. */
describe('admin translation chunk endpoints', () => {
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
      http.get(`${API_BASE}/admin/translation-runs/:id/chunks`, record),
      http.post(`${API_BASE}/admin/translation-chunks/:id/retry`, record),
      http.put(`${API_BASE}/admin/translation-chunks/:id`, record),
      http.get(`${API_BASE}/admin/versions/:id/dossier`, record),
      http.get(`${API_BASE}/admin/dossiers/:id/glossaries/:lang`, record)
    );
  });

  it('куски главы — язык и номер главы параметрами', async () => {
    await getTranslationChunks('r1', 'fr', 3);
    expect(seen[0]).toMatchObject({
      method: 'GET',
      path: '/admin/translation-runs/r1/chunks',
      search: '?lang=fr&chapter=3',
    });
  });

  it('повтор и правка — свои ручки куска с телом', async () => {
    await retryTranslationChunk('c1', { limitUsd: '0.5' });
    await retryTranslationChunk('c1', { model: 'x/y', limitUsd: '1' });
    await editTranslationChunk('c1', { blocks: [{ n: 4, text: 'quatre' }] });

    expect(seen.map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      { method: 'POST', path: '/admin/translation-chunks/c1/retry', body: { limitUsd: '0.5' } },
      {
        method: 'POST',
        path: '/admin/translation-chunks/c1/retry',
        body: { model: 'x/y', limitUsd: '1' },
      },
      {
        method: 'PUT',
        path: '/admin/translation-chunks/c1',
        body: { blocks: [{ n: 4, text: 'quatre' }] },
      },
    ]);
  });

  it('части адреса кодируются: чужое значение не уводит запрос на другую ручку', async () => {
    await getTranslationChunks('a/../b', 'fr', 1);
    await getDossierGlossary('d1', 'es/../x');
    expect(seen.map(({ path }) => path)).toEqual([
      '/admin/translation-runs/a%2F..%2Fb/chunks',
      '/admin/dossiers/d1/glossaries/es%2F..%2Fx',
    ]);
  });

  it('досье версии и глоссарий языка досье — только чтение', async () => {
    await getVersionDossier('v1');
    await getDossierGlossary('d1', 'es');
    expect(seen.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'GET /admin/versions/v1/dossier',
      'GET /admin/dossiers/d1/glossaries/es',
    ]);
  });
});
