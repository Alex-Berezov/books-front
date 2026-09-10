/**
 * Tests for the presigned-upload flow (`uploadAudioFile`) and one-step
 * multipart flow (`uploadMediaMultipart`) + the `X-Upload-Token` auth
 * contract for `/uploads/direct`.
 *
 * XHR is stubbed via a class installed on `globalThis.XMLHttpRequest` —
 * jsdom's XHR cannot reach MSW's presigned URL and doesn't emit progress
 * events reliably.
 */

import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadAudioFile, uploadMediaMultipart } from '@/api/endpoints/admin/uploads';
import { presignUpload, resolveUploadedUrl } from '@/api/endpoints/uploads';
import { ApiError } from '@/types/api';
import { installXhrStub } from '../../../helpers/xhrStub';
import { server } from '../../../msw/server';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() =>
    Promise.resolve({ accessToken: 'test-token', user: { id: 'u1' }, expires: '2099-01-01' })
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

// ---- XHR stub ----------------------------------------------------------

let stub: ReturnType<typeof installXhrStub>;
const xhrInstances = () => stub.instances;
let xhrAutoRespond = true;
let xhrRespondStatus = 201;
let xhrRespondBody: unknown = null;

beforeEach(() => {
  xhrAutoRespond = true;
  xhrRespondStatus = 201;
  xhrRespondBody = null;
  stub = installXhrStub({
    autoRespond: () => xhrAutoRespond,
    status: () => xhrRespondStatus,
    body: () => xhrRespondBody,
  });
});

afterEach(() => {
  stub.restore();
});

// ---- tests -------------------------------------------------------------

describe('presignUpload', () => {
  it('sends { type, contentType, size } — not { key }', async () => {
    let seenBody: unknown = null;
    server.use(
      http.post(`${API_BASE}/uploads/presign`, async ({ request }) => {
        seenBody = await request.json();
        // Форма ответа - как у боевого `PresignResponseDto` (`books`,
        // `uploads.service.ts:51-57`): адрес называется `url`. Мок с `uploadUrl` подтверждал
        // поле, которого сервер не отдаёт, и держал зелёным сломанный вызов (LEGACY-372).
        return HttpResponse.json({
          key: 'audio/abc.mp3',
          url: '/uploads/direct',
          method: 'POST',
          headers: { 'x-upload-token': 'upload-token', 'content-type': 'audio/mpeg' },
          token: 'upload-token',
          ttlSec: 900,
        });
      })
    );

    const res = await presignUpload({
      type: 'audio',
      contentType: 'audio/mpeg',
      size: 1234,
    });

    expect(seenBody).toEqual({ type: 'audio', contentType: 'audio/mpeg', size: 1234 });
    expect(res.token).toBe('upload-token');
    expect(res.key).toBe('audio/abc.mp3');
    expect(res.url).toBe('/uploads/direct');
    expect(res.method).toBe('POST');
    expect(res.ttlSec).toBe(900);
  });
});

describe('resolveUploadedUrl', () => {
  it('POSTs /uploads/confirm?key=...', async () => {
    let seenUrl = '';
    server.use(
      http.post(`${API_BASE}/uploads/confirm`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ key: 'audio/abc.mp3', publicUrl: 'https://cdn/abc.mp3' });
      })
    );

    const res = await resolveUploadedUrl('audio/abc.mp3');

    expect(seenUrl).toContain('key=audio%2Fabc.mp3');
    expect(res.publicUrl).toBe('https://cdn/abc.mp3');
  });
});

describe('uploadAudioFile (presigned flow)', () => {
  const setupPresignHappyPath = () => {
    server.use(
      http.post(`${API_BASE}/uploads/presign`, () =>
        HttpResponse.json({
          key: 'audio/abc.mp3',
          url: '/uploads/direct',
          method: 'POST',
          headers: { 'x-upload-token': 'upload-token', 'content-type': 'audio/mpeg' },
          token: 'upload-token',
          ttlSec: 900,
        })
      ),
      http.post(`${API_BASE}/uploads/confirm`, () =>
        HttpResponse.json({ key: 'audio/abc.mp3', publicUrl: 'https://cdn/abc.mp3' })
      ),
      http.post(`${API_BASE}/media/confirm`, async ({ request }) => {
        const body = (await request.json()) as { url: string; key: string };
        return HttpResponse.json({
          id: 'm-1',
          key: body.key,
          url: body.url,
          contentType: 'audio/mpeg',
          size: 100,
          width: null,
          height: null,
          duration: null,
          createdAt: '2026-01-01T00:00:00Z',
          createdById: 'u-1',
          isDeleted: false,
          deletedAt: null,
        });
      })
    );
  };

  it('happy path: presign → direct → confirm → /media/confirm with resolved publicUrl', async () => {
    setupPresignHappyPath();

    let mediaConfirmBody: { key: string; url: string; contentType: string; size: number } | null =
      null;
    server.use(
      http.post(`${API_BASE}/media/confirm`, async ({ request }) => {
        mediaConfirmBody = (await request.json()) as typeof mediaConfirmBody;
        return HttpResponse.json({
          id: 'm-1',
          key: (mediaConfirmBody as { key: string }).key,
          url: (mediaConfirmBody as { url: string }).url,
          contentType: 'audio/mpeg',
          size: (mediaConfirmBody as { size: number }).size,
          width: null,
          height: null,
          duration: null,
          createdAt: '2026-01-01T00:00:00Z',
          createdById: 'u-1',
          isDeleted: false,
          deletedAt: null,
        });
      })
    );

    const progress: number[] = [];
    const file = new File([new Uint8Array(100)], 'track.mp3', { type: 'audio/mpeg' });

    const result = await uploadAudioFile(file, {
      onProgress: (p) => progress.push(p),
    });

    expect(result.id).toBe('m-1');
    expect(result.url).toBe('https://cdn/abc.mp3');
    expect(mediaConfirmBody).toEqual({
      key: 'audio/abc.mp3',
      url: 'https://cdn/abc.mp3',
      contentType: 'audio/mpeg',
      size: 100,
    });

    // Progress reaches 100 at end.
    expect(progress[progress.length - 1]).toBe(100);
    expect(progress).toContain(50);

    const directXhr = xhrInstances()[0];
    // Адрес из presign относительный, и XHR разрешил бы его от origin фронта - поэтому
    // база API дописывается явно (LEGACY-372: до починки адрес был вообще `undefined`).
    expect(directXhr.url).toBe(`${API_BASE}/uploads/direct`);
    expect(directXhr.method).toBe('POST');
    // 🔴 `X-Upload-Token` авторизацией не является: ручка закрыта `JwtAuthGuard` и берёт
    // пользователя из `Authorization`. Без этого заголовка живой ответ - 401.
    expect(directXhr.headers['authorization']).toBe('Bearer test-token');
    expect(directXhr.headers['x-upload-token']).toBe('upload-token');
    expect(directXhr.headers['content-type']).toBe('audio/mpeg');
  });

  it('файл без распознанного MIME шлёт тот же Content-Type, что ушёл в presign', async () => {
    let presignBody: { contentType?: string } = {};
    server.use(
      http.post(`${API_BASE}/uploads/presign`, async ({ request }) => {
        presignBody = (await request.json()) as { contentType?: string };
        return HttpResponse.json({
          key: 'audio/abc.mp3',
          url: '/uploads/direct',
          method: 'POST',
          headers: { 'x-upload-token': 'upload-token', 'content-type': 'audio/mpeg' },
          token: 'upload-token',
          ttlSec: 900,
        });
      }),
      http.post(`${API_BASE}/uploads/confirm`, () =>
        HttpResponse.json({ key: 'audio/abc.mp3', publicUrl: 'https://cdn/abc.mp3' })
      ),
      http.post(`${API_BASE}/media/confirm`, async ({ request }) => {
        const body = (await request.json()) as { url: string; key: string };
        return HttpResponse.json({
          id: 'm-3',
          key: body.key,
          url: body.url,
          contentType: 'audio/mpeg',
          size: 1,
          width: null,
          height: null,
          duration: null,
          createdAt: '2026-01-01T00:00:00Z',
          createdById: 'u-1',
          isDeleted: false,
          deletedAt: null,
        });
      })
    );

    // Браузер не распознал тип: `file.type` пуст. В presign уходит `audio/mpeg`, и сервер
    // сверяет заголовок загрузки именно с ним - расхождение даёт 400 «Content-Type mismatch».
    const file = new File([new Uint8Array(1)], 'track', { type: '' });
    await uploadAudioFile(file);

    expect(presignBody.contentType).toBe('audio/mpeg');
    expect(xhrInstances()[0].headers['content-type']).toBe('audio/mpeg');
  });

  it('метод и заголовки берутся из ответа presign, а не прошиты', async () => {
    server.use(
      http.post(`${API_BASE}/uploads/presign`, () =>
        HttpResponse.json({
          key: 'audio/abc.mp3',
          url: 'https://storage.example.com/put/abc',
          method: 'PUT',
          headers: { 'x-amz-acl': 'private' },
          token: 'upload-token',
          ttlSec: 900,
        })
      ),
      http.post(`${API_BASE}/uploads/confirm`, () =>
        HttpResponse.json({ key: 'audio/abc.mp3', publicUrl: 'https://cdn/abc.mp3' })
      ),
      http.post(`${API_BASE}/media/confirm`, async ({ request }) => {
        const body = (await request.json()) as { url: string; key: string };
        return HttpResponse.json({
          id: 'm-4',
          key: body.key,
          url: body.url,
          contentType: 'audio/mpeg',
          size: 1,
          width: null,
          height: null,
          duration: null,
          createdAt: '2026-01-01T00:00:00Z',
          createdById: 'u-1',
          isDeleted: false,
          deletedAt: null,
        });
      })
    );

    const file = new File([new Uint8Array(1)], 'track.mp3', { type: 'audio/mpeg' });
    await uploadAudioFile(file);

    expect(xhrInstances()[0].method).toBe('PUT');
    expect(xhrInstances()[0].headers['x-amz-acl']).toBe('private');
    // Жетон сайта чужому хосту не отдаётся: адрес presign ведёт во внешнее хранилище.
    expect(xhrInstances()[0].headers['authorization']).toBeUndefined();
    expect(xhrInstances()[0].headers['x-upload-token']).toBeUndefined();
  });

  it('пустой адрес в ответе presign - отказ на месте, а не запрос по базе API', async () => {
    server.use(
      http.post(`${API_BASE}/uploads/presign`, () =>
        HttpResponse.json({
          key: 'audio/abc.mp3',
          url: '',
          method: 'POST',
          headers: {},
          token: 'upload-token',
          ttlSec: 900,
        })
      )
    );

    const file = new File([new Uint8Array(1)], 'track.mp3', { type: 'audio/mpeg' });
    await expect(uploadAudioFile(file)).rejects.toMatchObject({ error: 'UploadError' });
    expect(xhrInstances()).toHaveLength(0);
  });

  it('абсолютный адрес из presign уходит в XHR как есть, без базы API', async () => {
    server.use(
      http.post(`${API_BASE}/uploads/presign`, () =>
        HttpResponse.json({
          key: 'audio/abc.mp3',
          url: 'https://storage.example.com/put/abc',
          method: 'PUT',
          headers: {},
          token: 'upload-token',
          ttlSec: 900,
        })
      ),
      http.post(`${API_BASE}/uploads/confirm`, () =>
        HttpResponse.json({ key: 'audio/abc.mp3', publicUrl: 'https://cdn/abc.mp3' })
      ),
      http.post(`${API_BASE}/media/confirm`, async ({ request }) => {
        const body = (await request.json()) as { url: string; key: string };
        return HttpResponse.json({
          id: 'm-2',
          key: body.key,
          url: body.url,
          contentType: 'audio/mpeg',
          size: 1,
          width: null,
          height: null,
          duration: null,
          createdAt: '2026-01-01T00:00:00Z',
          createdById: 'u-1',
          isDeleted: false,
          deletedAt: null,
        });
      })
    );

    const file = new File([new Uint8Array(1)], 'track.mp3', { type: 'audio/mpeg' });
    await uploadAudioFile(file);

    expect(xhrInstances()[0].url).toBe('https://storage.example.com/put/abc');
    expect(xhrInstances()[0].headers['authorization']).toBeUndefined();
  });

  it('propagates ApiError with statusCode when /uploads/direct returns 4xx', async () => {
    setupPresignHappyPath();
    xhrRespondStatus = 413;

    const file = new File([new Uint8Array(1)], 'track.mp3', { type: 'audio/mpeg' });

    await expect(uploadAudioFile(file)).rejects.toMatchObject({
      statusCode: 413,
      error: 'UploadError',
    });
  });

  it('aborting via AbortSignal rejects with UploadAborted', async () => {
    setupPresignHappyPath();
    xhrAutoRespond = false;

    const file = new File([new Uint8Array(1)], 'track.mp3', { type: 'audio/mpeg' });
    const controller = new AbortController();

    const promise = uploadAudioFile(file, { signal: controller.signal });
    // Give presign a tick to resolve and create the XHR.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ error: 'UploadAborted' });
  });

  it('pre-aborted signal aborts the XHR immediately', async () => {
    setupPresignHappyPath();
    xhrAutoRespond = false;

    const file = new File([new Uint8Array(1)], 'track.mp3', { type: 'audio/mpeg' });
    const controller = new AbortController();
    controller.abort();

    await expect(uploadAudioFile(file, { signal: controller.signal })).rejects.toMatchObject({
      error: 'UploadAborted',
    });
  });
});

describe('uploadMediaMultipart (one-step)', () => {
  it('uses Authorization header and progresses to 100', async () => {
    xhrRespondStatus = 201;
    xhrRespondBody = {
      id: 'm-2',
      key: 'audio/x.mp3',
      url: 'https://cdn/x.mp3',
      contentType: 'audio/mpeg',
      size: 100,
      width: null,
      height: null,
      duration: null,
      createdAt: '2026-01-01T00:00:00Z',
      createdById: 'u-1',
      isDeleted: false,
      deletedAt: null,
    };

    const progress: number[] = [];
    const file = new File([new Uint8Array(100)], 'track.mp3', { type: 'audio/mpeg' });

    const result = await uploadMediaMultipart(file, {
      onProgress: (p) => progress.push(p),
    });

    expect(result.id).toBe('m-2');
    expect(progress[progress.length - 1]).toBe(100);

    const xhr = xhrInstances()[0];
    expect(xhr.headers['authorization']).toBe('Bearer test-token');
    expect(xhr.url).toContain('/media/upload');
    expect(xhr.body).toBeInstanceOf(FormData);
  });

  it('rejects with ApiError when server returns 5xx', async () => {
    xhrRespondStatus = 500;
    xhrRespondBody = null;

    const file = new File([new Uint8Array(1)], 'track.mp3', { type: 'audio/mpeg' });

    await expect(uploadMediaMultipart(file)).rejects.toMatchObject({
      statusCode: 500,
      error: 'UploadError',
    });
  });
});
