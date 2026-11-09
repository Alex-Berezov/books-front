import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { getBookAnalysis, saveBookAnalysis } from '@/api/endpoints/admin/bookAnalyses';
import { isRecordChanged } from '@/lib/admin/expected-row';
import { server } from '../../../msw/server';

// Живая сессия пропускает httpXxxAuth мимо проверки «401 до сети» (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

describe('admin book analysis endpoints (F03-1)', () => {
  // Нет анализа — бэкенд отвечает `null`, по проводу это 200 с пустым телом. `undefined`
  // из `queryFn` react-query 5 считает ошибкой, и вкладка не дала бы ввести первый анализ.
  it('пустой ответ — null, а не undefined', async () => {
    server.use(
      http.get(
        `${API_BASE}/versions/:id/analysis`,
        () => new HttpResponse(null, { status: 200, headers: { 'content-length': '0' } })
      )
    );
    await expect(getBookAnalysis('v1')).resolves.toBeNull();
  });

  it('пробное сохранение идёт с ?dryRun=true, обычное — без параметра', async () => {
    const urls: string[] = [];
    server.use(
      http.put(`${API_BASE}/versions/:id/analysis`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({ analysis: null, hasCore: false, warnings: [] });
      })
    );
    await saveBookAnalysis('v1', { language: 'en' }, true);
    await saveBookAnalysis('v1', { language: 'en' });
    expect(new URL(urls[0]!).searchParams.get('dryRun')).toBe('true');
    expect(new URL(urls[1]!).search).toBe('');
  });

  // LEGACY-496: сверка записи только при настоящем сохранении; пробное её не несёт.
  it('expectedUpdatedAt уходит в query обычного сохранения, пробное его не шлёт', async () => {
    const urls: string[] = [];
    server.use(
      http.put(`${API_BASE}/versions/:id/analysis`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({ analysis: null, hasCore: false, warnings: [] });
      })
    );
    const seen = '2026-10-17T00:00:00.000Z';
    await saveBookAnalysis('v1', { language: 'en' }, false, { expectedUpdatedAt: seen });
    await saveBookAnalysis('v1', { language: 'en' }, true, { expectedUpdatedAt: seen });
    await saveBookAnalysis('v1', { language: 'en' }, false, { expectedAbsent: 'true' });
    await saveBookAnalysis('v1', { language: 'en' }, true, { expectedAbsent: 'true' });
    expect(new URL(urls[0]!).searchParams.get('expectedUpdatedAt')).toBe(seen);
    expect(new URL(urls[1]!).searchParams.has('expectedUpdatedAt')).toBe(false);
    expect(new URL(urls[2]!).searchParams.get('expectedAbsent')).toBe('true');
    expect(new URL(urls[3]!).searchParams.has('expectedAbsent')).toBe(false);
  });

  // Настоящая форма отказа бэкенда: код лежит в корне тела.
  it('409 с кодом RECORD_CHANGED из тела ответа распознаётся как чужая правка', async () => {
    server.use(
      http.put(`${API_BASE}/versions/:id/analysis`, () =>
        HttpResponse.json(
          { statusCode: 409, error: 'Conflict', code: 'RECORD_CHANGED', message: 'changed' },
          { status: 409 }
        )
      )
    );
    const failure = await saveBookAnalysis('v1', { language: 'en' }).catch((e: unknown) => e);
    expect(isRecordChanged(failure)).toBe(true);
  });

  // В1: ссылки ключей проверяет только сервер — его отказ обязан дойти до тоста с путём поля.
  it('отказ сохранения 400 несёт путь поля в тексте ошибки', async () => {
    server.use(
      http.put(`${API_BASE}/versions/:id/analysis`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: ['characters.0.themeKeys.0: unknown theme key "x"'],
            error: 'Bad Request',
          },
          { status: 400 }
        )
      )
    );
    await expect(saveBookAnalysis('v1', { language: 'en' })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('characters.0.themeKeys.0'),
    });
  });
});
