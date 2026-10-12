import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { installXhrStub } from '../../helpers/xhrStub';

/**
 * LEGACY-465, заход 2. Три обхода http-клиента — прямая загрузка по presign, многочастная
 * загрузка и скачивание правового файла — идут через серверный прокси своего домена: токена
 * в браузере нет, его ставит сервер. Без живой сессии — 401 до отправки тела: прокси ответил бы
 * тем же, но уже после загрузки.
 */

const getSessionMock = vi.hoisted(() => vi.fn<() => Promise<unknown>>());

vi.mock('next-auth/react', () => ({
  getSession: getSessionMock,
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';
const LIVE = { user: { id: 'u1' }, expires: '2099-01-01' };

const freshModules = async () => {
  // Кэш сессии живёт на уровне модуля — свежий модуль на каждый тест.
  vi.resetModules();
  return {
    uploads: await import('@/api/endpoints/uploads'),
    rightsFiles: await import('@/api/endpoints/admin/rights-files'),
  };
};

describe('ownApiProxyUrl — своё API через прокси, чужой хост как есть', () => {
  it.each([
    [`${API_BASE}/uploads/direct`, '/api/backend/uploads/direct'],
    [`${API_BASE}/uploads/direct?part=1`, '/api/backend/uploads/direct?part=1'],
    [API_BASE, '/api/backend'],
  ])('%s → %s', async (url, expected) => {
    const { uploads } = await freshModules();
    expect(uploads.ownApiProxyUrl(url)).toBe(expected);
  });

  it.each([
    'https://storage.example.com/bucket/key',
    'http://localhost:5000.evil.example/api/uploads/direct',
    'http://localhost:5000/apifoo/uploads/direct',
    'http://localhost:5001/api/uploads/direct',
    'not a url',
  ])('%s — чужой адрес, не прокси', async (url) => {
    const { uploads } = await freshModules();
    expect(uploads.ownApiProxyUrl(url)).toBeNull();
  });
});

describe('обходы без живой сессии — 401 до сети', () => {
  let stub: ReturnType<typeof installXhrStub>;
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    stub = installXhrStub({ autoRespond: () => true, status: () => 201, body: () => null });
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    getSessionMock.mockReset();
  });

  afterEach(() => {
    stub.restore();
    fetchSpy.mockRestore();
  });

  it.each([null, { ...LIVE, error: 'SessionEnded' }])(
    'sendPresignedBody с сессией %j не отправляет тело',
    async (session) => {
      getSessionMock.mockResolvedValue(session);
      const { uploads } = await freshModules();
      const file = new File([new Uint8Array(4)], 'a.png', { type: 'image/png' });

      await expect(
        uploads.sendPresignedBody(
          { token: 't', key: 'k', url: '/uploads/direct', method: 'POST' } as never,
          'image/png',
          file
        )
      ).rejects.toMatchObject({ statusCode: 401 });
      expect(stub.instances).toHaveLength(0);
    }
  );

  it('downloadRightsFile без сессии не ходит в сеть', async () => {
    getSessionMock.mockResolvedValue(null);
    const { rightsFiles } = await freshModules();

    await expect(rightsFiles.downloadRightsReportPdf('imp-1')).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('скачивание правового файла — через прокси без токена', () => {
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue(LIVE);
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['%PDF']), {
        status: 200,
        headers: { 'content-disposition': 'attachment; filename="report.pdf"' },
      })
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined })
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('запрос идёт на адрес прокси с его заголовком и без Authorization', async () => {
    const { rightsFiles } = await freshModules();
    await rightsFiles.downloadRightsReportPdf('imp-1');

    const [url, init] = fetchSpy.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(String(url)).toBe('/api/backend/admin/rights/review-imports/imp-1/report-pdf');
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('x-bibliaris-proxy')).toBe('1');
  });
});
