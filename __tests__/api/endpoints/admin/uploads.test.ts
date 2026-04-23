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
import {
  presignUpload,
  resolveUploadedUrl,
  uploadAudioFile,
  uploadMediaMultipart,
} from '@/api/endpoints/admin/uploads';
import { ApiError } from '@/types/api';
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

interface XhrListenerMap {
  load: Array<() => void>;
  error: Array<() => void>;
  abort: Array<() => void>;
}

type UploadListenerMap = { progress: Array<(e: ProgressEvent) => void> };

interface MockXhrInstance {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  status: number;
  response: unknown;
  upload: { addEventListener: (t: string, cb: (e: ProgressEvent) => void) => void };
  open: (m: string, u: string) => void;
  setRequestHeader: (k: string, v: string) => void;
  addEventListener: (t: keyof XhrListenerMap, cb: () => void) => void;
  send: (body: unknown) => void;
  abort: () => void;
  responseType: string;
  aborted: boolean;
  _listeners: XhrListenerMap;
  _upload: UploadListenerMap;
}

const xhrInstances: MockXhrInstance[] = [];
let xhrAutoRespond = true;
let xhrRespondStatus = 201;
let xhrRespondBody: unknown = null;

const createMockXhr = (): MockXhrInstance => {
  const instance: MockXhrInstance = {
    method: '',
    url: '',
    headers: {},
    body: undefined,
    status: 0,
    response: null,
    responseType: '',
    aborted: false,
    _listeners: { load: [], error: [], abort: [] },
    _upload: { progress: [] },
    upload: {
      addEventListener(type, cb) {
        if (type === 'progress') instance._upload.progress.push(cb);
      },
    },
    open(method, url) {
      this.method = method;
      this.url = url;
    },
    setRequestHeader(k, v) {
      this.headers[k] = v;
    },
    addEventListener(type, cb) {
      this._listeners[type].push(cb);
    },
    send(body) {
      this.body = body;
      if (!xhrAutoRespond) return;
      // Synchronously fire progress + load.
      queueMicrotask(() => {
        if (this.aborted) return;
        this._upload.progress.forEach((cb) =>
          cb({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent)
        );
        this._upload.progress.forEach((cb) =>
          cb({ lengthComputable: true, loaded: 100, total: 100 } as ProgressEvent)
        );
        this.status = xhrRespondStatus;
        this.response = xhrRespondBody;
        this._listeners.load.forEach((cb) => cb());
      });
    },
    abort() {
      this.aborted = true;
      queueMicrotask(() => {
        this._listeners.abort.forEach((cb) => cb());
      });
    },
  };
  return instance;
};

let originalXhr: typeof XMLHttpRequest;

beforeEach(() => {
  xhrInstances.length = 0;
  xhrAutoRespond = true;
  xhrRespondStatus = 201;
  xhrRespondBody = null;
  originalXhr = globalThis.XMLHttpRequest;
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = function () {
    const inst = createMockXhr();
    xhrInstances.push(inst);
    return inst;
  } as unknown as typeof XMLHttpRequest;
});

afterEach(() => {
  globalThis.XMLHttpRequest = originalXhr;
});

// ---- tests -------------------------------------------------------------

describe('presignUpload', () => {
  it('sends { type, contentType, size } — not { key }', async () => {
    let seenBody: unknown = null;
    server.use(
      http.post(`${API_BASE}/uploads/presign`, async ({ request }) => {
        seenBody = await request.json();
        return HttpResponse.json({
          token: 'upload-token',
          uploadUrl: 'https://storage.example.com/put/abc',
          key: 'audio/abc.mp3',
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
          token: 'upload-token',
          uploadUrl: 'https://storage.example.com/put/abc',
          key: 'audio/abc.mp3',
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

    // XHR used X-Upload-Token (not Authorization).
    const directXhr = xhrInstances[0];
    expect(directXhr.url).toBe('https://storage.example.com/put/abc');
    expect(directXhr.headers['X-Upload-Token']).toBe('upload-token');
    expect(directXhr.headers['Authorization']).toBeUndefined();
    expect(directXhr.headers['Content-Type']).toBe('audio/mpeg');
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

    const xhr = xhrInstances[0];
    expect(xhr.headers['Authorization']).toBe('Bearer test-token');
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
