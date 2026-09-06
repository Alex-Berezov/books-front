import { http, HttpResponse } from 'msw';
import { describe, it, expect } from 'vitest';
import { buildUrlWithParams, getClockSkewMs } from '@/lib/http';
import { httpGet, httpPost, httpPatch, httpPut, httpDelete } from '@/lib/http';
import { ApiError } from '@/types/api';
import { server } from '../msw/server';

// We need to import httpGet dynamically or assume it's exported.
// Since I haven't seen httpGet exported, I'll check the file content again or assume it follows the pattern.
// Let's assume httpGet is exported.

describe('HTTP Utils', () => {
  describe('buildUrlWithParams', () => {
    it('should return endpoint if no params', () => {
      expect(buildUrlWithParams('/test')).toBe('/test');
    });

    it('should append query params', () => {
      expect(buildUrlWithParams('/test', { page: 1, sort: 'asc' })).toBe('/test?page=1&sort=asc');
    });

    it('should ignore undefined values', () => {
      expect(buildUrlWithParams('/test', { page: 1, filter: undefined })).toBe('/test?page=1');
    });
  });

  describe('httpGet', () => {
    it('should make a GET request and return data', async () => {
      server.use(
        http.get('http://localhost:5000/api/test-get', () => {
          return HttpResponse.json({ message: 'success' });
        })
      );

      const data = await httpGet<{ message: string }>('/test-get');
      expect(data).toEqual({ message: 'success' });
    });

    it('should handle 404 error', async () => {
      server.use(
        http.get('http://localhost:5000/api/not-found', () => {
          return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
        })
      );

      await expect(httpGet('/not-found')).rejects.toThrow(ApiError);
    });
  });

  /**
   * LEGACY-270: слияние прогресса чтения сравнивает часы клиента и сервера без
   * поправки. `recordClockSkew` снимает расхождение с заголовка `Date` любого
   * ответа, включая отказ — иначе поправка не работала бы на 502 от `getProgress`.
   */
  describe('getClockSkewMs', () => {
    it('снимает расхождение с заголовка Date успешного ответа', async () => {
      server.use(
        http.get('http://localhost:5000/api/clock-skew', () => {
          return HttpResponse.json(
            { ok: true },
            { headers: { Date: new Date(Date.now() + 60 * 60 * 1000).toUTCString() } }
          );
        })
      );

      await httpGet('/clock-skew');

      expect(getClockSkewMs()).toBeGreaterThan(50 * 60 * 1000);
    });

    it('снимает расхождение и с ответа-отказа', async () => {
      server.use(
        http.get('http://localhost:5000/api/clock-skew-error', () => {
          return HttpResponse.json(
            { message: 'nope' },
            { status: 500, headers: { Date: new Date(Date.now() - 60 * 60 * 1000).toUTCString() } }
          );
        })
      );

      await httpGet('/clock-skew-error').catch(() => undefined);

      expect(getClockSkewMs()).toBeLessThan(-50 * 60 * 1000);
    });

    /**
     * 🔴 Перед API стоит Cloudflare, публичные ручки помечены `public, s-maxage`.
     * У кэшированного ответа `Date` — момент первичного ответа, и без этой ветки
     * возраст кэша уехал бы в сравнение времён слияния как расхождение часов.
     */
    it('ответ из кэша (есть Age) расхождение не двигает', async () => {
      server.use(
        http.get('http://localhost:5000/api/clock-skew-cached', () => {
          return HttpResponse.json(
            { ok: true },
            {
              headers: {
                Date: new Date(Date.now() - 6 * 60 * 60 * 1000).toUTCString(),
                Age: '21600',
              },
            }
          );
        })
      );

      const before = getClockSkewMs();
      await httpGet('/clock-skew-cached');

      expect(getClockSkewMs()).toBe(before);
    });

    it('расхождение больше суток отбрасывается как мусор', async () => {
      server.use(
        http.get('http://localhost:5000/api/clock-skew-absurd', () => {
          return HttpResponse.json(
            { ok: true },
            { headers: { Date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toUTCString() } }
          );
        })
      );

      const before = getClockSkewMs();
      await httpGet('/clock-skew-absurd');

      expect(getClockSkewMs()).toBe(before);
    });
  });

  /**
   * LEGACY-139: раньше объект для `fetch` выглядел как `{ method, headers, ...options }`,
   * и `headers` внутри options затирал собранные заголовки целиком. Возврат того
   * порядка ключей роняет каждую проверку в этом блоке.
   */
  describe('заголовки вызывающего кода не заменяют собранные', () => {
    it('оставляет Authorization и Accept-Language рядом с чужим заголовком', async () => {
      let received: Headers | undefined;

      server.use(
        http.get('http://localhost:5000/api/headers-object', ({ request }) => {
          received = request.headers;
          return HttpResponse.json({ ok: true });
        })
      );

      await httpGet('/headers-object', {
        headers: { 'X-Trace': '1' },
        language: 'ru',
        accessToken: 't',
      });

      expect(received?.get('X-Trace')).toBe('1');
      expect(received?.get('Authorization')).toBe('Bearer t');
      expect(received?.get('Accept-Language')).toBe('ru');
    });

    it('переживает headers, переданные экземпляром Headers', async () => {
      let received: Headers | undefined;

      server.use(
        http.get('http://localhost:5000/api/headers-instance', ({ request }) => {
          received = request.headers;
          return HttpResponse.json({ ok: true });
        })
      );

      // `HttpRequestOptions` наследует `RequestInit`, поэтому `Headers` здесь
      // законен — а спредом такой объект не копируется вовсе.
      await httpGet('/headers-instance', {
        headers: new Headers({ 'X-Trace': '2' }),
        language: 'fr',
        accessToken: 't2',
      });

      expect(received?.get('X-Trace')).toBe('2');
      expect(received?.get('Authorization')).toBe('Bearer t2');
      expect(received?.get('Accept-Language')).toBe('fr');
    });

    it('не даёт вызывающему подменить Authorization своим значением', async () => {
      let received: Headers | undefined;

      server.use(
        http.get('http://localhost:5000/api/headers-override', ({ request }) => {
          received = request.headers;
          return HttpResponse.json({ ok: true });
        })
      );

      await httpGet('/headers-override', {
        headers: { Authorization: 'Bearer someone-else' },
        accessToken: 'mine',
      });

      expect(received?.get('Authorization')).toBe('Bearer mine');
    });

    it('не пропускает чужой Authorization и Accept-Language, когда слой их не ставил', async () => {
      let received: Headers | undefined;

      server.use(
        http.get('http://localhost:5000/api/headers-smuggle', ({ request }) => {
          received = request.headers;
          return HttpResponse.json({ ok: true });
        })
      );

      // Гарантия двусторонняя: эти два заголовка задаются только полями
      // `accessToken` и `language`. Иначе запрос без токена увозил бы чужой,
      // хотя слой обещает обратное.
      await httpGet('/headers-smuggle', {
        headers: { Authorization: 'Bearer smuggled', 'Accept-Language': 'de' },
      });

      expect(received?.get('Authorization')).toBeNull();
      expect(received?.get('Accept-Language')).toBeNull();
    });

    it('не даёт options подменить method и body', async () => {
      let receivedBody: unknown;

      // Обработчик зарегистрирован на POST: подмена метода из options уводит
      // запрос мимо него, и msw отвечает ошибкой вместо этого тела.
      server.use(
        http.post('http://localhost:5000/api/method-guard', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({ ok: true });
        })
      );

      await httpPost(
        '/method-guard',
        { real: true },
        { method: 'GET', body: JSON.stringify({ real: false }) }
      );

      expect(receivedBody).toEqual({ real: true });
    });

    // Порядок ключей правился во всех пяти методах — сторожить надо тоже все пять.
    const withBody = [
      { name: 'httpPatch', call: httpPatch, register: http.patch },
      { name: 'httpPut', call: httpPut, register: http.put },
    ] as const;

    it.each(withBody)('$name сохраняет собранные заголовки', async ({ name, call, register }) => {
      let received: Headers | undefined;
      const path = `/merge-${name}`;

      server.use(
        register(`http://localhost:5000/api${path}`, ({ request }) => {
          received = request.headers;
          return HttpResponse.json({ ok: true });
        })
      );

      await call(
        path,
        { real: true },
        { headers: { 'X-Trace': '3' }, language: 'es', accessToken: 't3' }
      );

      expect(received?.get('X-Trace')).toBe('3');
      expect(received?.get('Authorization')).toBe('Bearer t3');
      expect(received?.get('Accept-Language')).toBe('es');
    });

    it('httpDelete сохраняет собранные заголовки', async () => {
      let received: Headers | undefined;

      server.use(
        http.delete('http://localhost:5000/api/merge-delete', ({ request }) => {
          received = request.headers;
          return HttpResponse.json({ ok: true });
        })
      );

      await httpDelete('/merge-delete', {
        headers: { 'X-Trace': '4' },
        language: 'pt',
        accessToken: 't4',
      });

      expect(received?.get('X-Trace')).toBe('4');
      expect(received?.get('Authorization')).toBe('Bearer t4');
      expect(received?.get('Accept-Language')).toBe('pt');
    });
  });
});
