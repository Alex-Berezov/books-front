/**
 * `uploadAvatar`: загрузка аватара идёт тем же путём, что и загрузка аудио.
 *
 * До 10.09.2026 здесь стояла вторая копия XHR-обёртки: прошитый `POST`, адрес склейкой строк
 * и **без** заголовка `Authorization`. Ручка `POST /uploads/direct` закрыта `JwtAuthGuard`
 * (`books/src/modules/uploads/uploads.controller.ts:88-100`), то есть путь аватара повторял
 * все половины `LEGACY-372` - только на нём загрузка была живая и отвечала 401.
 */

import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadAvatar } from '@/api/endpoints/auth';
import { installXhrStub } from '../../helpers/xhrStub';
import { server } from '../../msw/server';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

let stub: ReturnType<typeof installXhrStub>;
const instances = () => stub.instances;

beforeEach(() => {
  stub = installXhrStub({ withProgress: false });

  server.use(
    http.post(`${API_BASE}/uploads/presign`, () =>
      HttpResponse.json({
        key: 'cover/abc.png',
        url: '/uploads/direct',
        method: 'POST',
        headers: { 'x-upload-token': 'upload-token', 'content-type': 'image/png' },
        token: 'upload-token',
        ttlSec: 900,
      })
    ),
    http.post(`${API_BASE}/uploads/confirm`, () =>
      HttpResponse.json({ key: 'cover/abc.png', publicUrl: 'https://cdn/abc.png' })
    )
  );
});

afterEach(() => {
  stub.restore();
});

describe('uploadAvatar', () => {
  it('шлёт тело через серверный прокси с разовым токеном и без жетона сайта', async () => {
    const file = new File([new Uint8Array(4)], 'avatar.png', { type: 'image/png' });

    const url = await uploadAvatar(file);

    expect(url).toBe('https://cdn/abc.png');
    expect(instances()).toHaveLength(1);
    // Адрес из presign относительный и ведёт на своё API: тело идёт через прокси своего домена,
    // `Authorization` ставит сервер из куки сессии (LEGACY-465).
    expect(instances()[0].url).toBe('/api/backend/uploads/direct');
    expect(instances()[0].method).toBe('POST');
    expect(instances()[0].headers['authorization']).toBeUndefined();
    expect(instances()[0].headers['x-bibliaris-proxy']).toBe('1');
    expect(instances()[0].headers['x-upload-token']).toBe('upload-token');
    expect(instances()[0].headers['content-type']).toBe('image/png');
  });

  it('файл без распознанного MIME не расходится с тем, что ушло в presign', async () => {
    let presigned: { contentType?: string } = {};
    server.use(
      http.post(`${API_BASE}/uploads/presign`, async ({ request }) => {
        presigned = (await request.json()) as { contentType?: string };
        return HttpResponse.json({
          key: 'cover/abc.bin',
          url: '/uploads/direct',
          method: 'POST',
          headers: {},
          token: 'upload-token',
          ttlSec: 900,
        });
      })
    );

    const file = new File([new Uint8Array(4)], 'avatar', { type: '' });
    await uploadAvatar(file);

    expect(presigned.contentType).toBe('application/octet-stream');
    expect(instances()[0].headers['content-type']).toBe('application/octet-stream');
  });
});
