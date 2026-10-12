/**
 * Загрузка файлов: общие примитивы и ручки `/uploads/**`.
 *
 * Модуль неадминский намеренно: тем же путём идёт аватар из публичного профиля
 * (`api/endpoints/auth.ts`), и держать общие функции в `api/endpoints/admin/**` значило бы,
 * что публичный код зависит от админского. Админская часть - сборка `MediaAsset` и
 * многочастная загрузка - осталась в `api/endpoints/admin/uploads.ts`.
 *
 * Порядок варианта B описан в
 * `books-app-docs/ai-context/api-contracts.md` («Media / Uploads»):
 *
 *   POST /uploads/presign        { type, contentType, size }              → { token, url, method, key }
 *   POST /uploads/direct         (binary + X-Upload-Token, через серверный прокси) → 201
 *   POST /uploads/confirm?key=…                                            → { key, publicUrl }
 */

import { backendProxyUrl, BACKEND_PROXY_REQUEST_HEADERS } from '@/lib/http';
import { httpGetAuth, httpPostAuth, requireLiveSession } from '@/lib/http-client';
import { API_BASE_URL, HTTP_HEADER } from '@/lib/http.constants';
import { ApiError } from '@/types/api';
import type {
  PresignUploadRequest,
  PresignUploadResponse,
  UploadLimits,
  UploadsConfirmResponse,
} from '@/types/api-schema';

/**
 * Абсолютный адрес для XHR по значению из `POST /uploads/presign`.
 *
 * Единственный драйвер бэкенда сегодня отдаёт относительный `/uploads/direct`
 * (`books/src/modules/uploads/uploads.service.ts:53`), а XHR разрешает такой адрес
 * от origin **фронта** - запрос ушёл бы на сайт, где ручки нет вовсе. Абсолютный адрес
 * (такой отдал бы драйвер внешнего хранилища) остаётся как есть.
 *
 * ⚠️ `new URL('/uploads/direct', base)` здесь **не годится**: путь с ведущим слэшем отбрасывает
 * путь базы, и адрес получился бы без префикса `/api`. Поэтому база и путь склеиваются, а `URL`
 * служит только проверкой результата. Пустое значение и протокол-относительный `//host/path` -
 * это сломанный ответ ручки, а не адрес: такой отказ виден сразу, а не через 404 на чужом хосте.
 */
export const absoluteUploadUrl = (url: string): string => {
  const reject = (why: string): never => {
    throw new ApiError({
      message: `Presigned upload URL is unusable (${why}): ${JSON.stringify(url)}`,
      statusCode: 0,
      error: 'UploadError',
    });
  };
  if (!url) return reject('пусто');
  if (url.startsWith('//')) return reject('протокол-относительный адрес');
  const absolute = /^https?:\/\//i.test(url)
    ? url
    : `${API_BASE_URL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
  try {
    return new URL(absolute).toString();
  } catch {
    return reject('не разбирается как адрес');
  }
};

/**
 * Адрес серверного прокси для адреса своего API, `null` — адрес чужой (внешнее хранилище).
 *
 * Своё API пользователя узнаёт по куке сессии, которую видит только прокси своего домена
 * (`LEGACY-465`): тело идёт туда, и токен добавляет сервер. На адрес внешнего хранилища тело
 * уходит как есть, без заголовков сайта.
 */
export const ownApiProxyUrl = (url: string): string | null => {
  try {
    const target = new URL(url);
    const base = new URL(API_BASE_URL);
    if (target.origin !== base.origin) return null;
    const basePath = base.pathname.replace(/\/+$/, '');
    const insideBase =
      !basePath || target.pathname === basePath || target.pathname.startsWith(`${basePath}/`);
    if (!insideBase) return null;
    return backendProxyUrl(`${target.pathname.slice(basePath.length)}${target.search}`);
  } catch {
    return null;
  }
};

/**
 * Fetch the server-side upload limits (public, cacheable per session).
 */
export const getUploadsLimits = async (): Promise<UploadLimits> => {
  return httpGetAuth<UploadLimits>('/uploads/limits', { requireAuth: false });
};

/**
 * Request a presigned upload URL + token.
 */
export const presignUpload = async (data: PresignUploadRequest): Promise<PresignUploadResponse> => {
  return httpPostAuth<PresignUploadResponse>('/uploads/presign', data);
};

/**
 * Resolve the public URL for a key after a successful presigned upload.
 *
 * This must be called between `/uploads/direct` and `/media/confirm`: the
 * backend validator on `/media/confirm` requires a well-formed `url`.
 */
export const resolveUploadedUrl = async (key: string): Promise<UploadsConfirmResponse> => {
  const search = new URLSearchParams({ key }).toString();
  return httpPostAuth<UploadsConfirmResponse>(`/uploads/confirm?${search}`, undefined);
};

/**
 * Options accepted by `uploadBinaryWithProgress` and `uploadAudioFile`.
 */
export interface UploadProgressOptions {
  /** Called with an integer 0..100 whenever the browser reports progress. */
  onProgress?: (percent: number) => void;
  /** AbortSignal — aborts the underlying XHR. */
  signal?: AbortSignal;
}

/**
 * Шаг «direct» целиком: взять жетон, собрать цель по ответу presign и отправить тело.
 *
 * Один на оба пути загрузки (аудиоглава в админке и аватар в профиле). До 10.09.2026 эти
 * восемнадцать строк стояли двумя копиями, и путь аватара собрал все три половины
 * `LEGACY-372`: адрес без базы API, прошитый `POST` и отсутствие `Authorization`.
 */
export const sendPresignedBody = async (
  presign: PresignUploadResponse,
  contentType: string,
  file: File,
  options: UploadProgressOptions = {}
): Promise<void> => {
  // Без живой сессии — 401 до отправки тела: прокси ответил бы тем же, но уже после загрузки.
  await requireLiveSession();
  await uploadBinaryWithProgress(
    {
      url: absoluteUploadUrl(presign.url),
      method: presign.method,
      headers: presign.headers,
      token: presign.token,
      contentType,
    },
    file,
    options
  );
};

/**
 * Куда и чем слать тело: всё, что об этом сказала ручка presign.
 */
export interface BinaryUploadTarget {
  /** Абсолютный адрес; относительный из ответа уже дополнен базой API. */
  url: string;
  /** Метод из ответа presign: локальный драйвер просит `POST`, S3-подобный - `PUT`. */
  method: 'POST' | 'PUT';
  /** Заголовки, которые ручка просит передать вместе с телом. */
  headers?: Record<string, string>;
  /** Разовый токен загрузки (`X-Upload-Token`). */
  token: string;
  /** Тот же `contentType`, который ушёл в presign: сервер сверяет их строго. */
  contentType: string;
}

/**
 * POST/PUT the binary body to a presigned URL using XHR to get upload progress.
 *
 * 🔴 `X-Upload-Token` авторизацией **не является**: `POST /uploads/direct` закрыт
 * `JwtAuthGuard` и берёт пользователя из `Authorization: Bearer`
 * (`books/src/modules/uploads/uploads.controller.ts:88-100`), а разовый токен лишь называет
 * загружаемый объект. `Authorization` ставит серверный прокси `/api/backend` из куки сессии
 * (`LEGACY-465`): тело на своё API идёт через него, и без сессии прокси отвечает 401
 * (`LEGACY-372` — тот же 401 от ручки, когда заголовка не было вовсе).
 *
 * `Content-Type` берётся тем же значением, что ушло в presign: сервер сверяет их строго
 * и отвечает 400 «Content-Type mismatch» при расхождении
 * (`books/src/modules/uploads/uploads.service.ts:70-72`). Пустой заголовок сервер читает
 * как `application/octet-stream`, поэтому «поставим, только если браузер угадал тип» -
 * это 400 на каждом файле без распознанного MIME.
 *
 * 🔴 `setRequestHeader` повторным вызовом значение **не заменяет, а склеивает** через запятую,
 * и имя сравнивает без учёта регистра. Ручка presign отдаёт в `headers` ровно те имена, что
 * ставятся здесь (`x-upload-token`, `content-type`), поэтому чужие значения по этим именам
 * отбрасываются: иначе в запрос уходит `x-upload-token: <uuid>, <uuid>`, кэш такого токена
 * не знает и ручка отвечает 401 - тем самым отказом, ради снятия которого правка и делалась.
 *
 * Resolves on HTTP 2xx. Rejects with `ApiError` on non-2xx or transport error.
 */
export const uploadBinaryWithProgress = (
  target: BinaryUploadTarget,
  file: File,
  options: UploadProgressOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // 🔴 Через прокси идёт только своё API. Адрес из presign может указывать на внешнее
    // хранилище (тип допускает `PUT` и абсолютный адрес): туда тело уходит напрямую, без
    // заголовков сайта, - S3 на подписанной ссылке с лишним заголовком авторизации отвечает 400
    // «only one auth mechanism allowed». Сравнение разобранными адресами, а не префиксом
    // строки: при базе без пути (`https://api.bibliaris.com`) префикс сделал бы «своим» хост
    // `https://api.bibliaris.com.evil.com`. Путь сверяется по границе сегмента - `/api`
    // не должен совпадать с `/apifoo`.
    const proxyUrl = ownApiProxyUrl(target.url);
    const toOwnApi = proxyUrl !== null;
    xhr.open(target.method, proxyUrl ?? target.url, true);
    const ownHeaders = new Set(
      toOwnApi
        ? ['authorization', HTTP_HEADER.UPLOAD_TOKEN.toLowerCase(), 'content-type']
        : ['content-type']
    );
    for (const [name, value] of Object.entries(target.headers ?? {})) {
      if (ownHeaders.has(name.toLowerCase())) continue;
      // Схема ручки описывает `headers` как бестиповый объект, поэтому тип `Record<string, string>`
      // здесь ничем не сторожится (`LEGACY-374`): нестроковое значение уехало бы в запрос
      // как `[object Object]`, и хранилище ответило бы 400 без внятной причины.
      if (typeof value !== 'string') continue;
      xhr.setRequestHeader(name, value);
    }
    if (toOwnApi) {
      for (const [name, value] of Object.entries(BACKEND_PROXY_REQUEST_HEADERS)) {
        xhr.setRequestHeader(name, value);
      }
      xhr.setRequestHeader(HTTP_HEADER.UPLOAD_TOKEN, target.token);
    }
    xhr.setRequestHeader('Content-Type', target.contentType);

    if (options.onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        options.onProgress?.(percent);
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100);
        resolve();
        return;
      }
      reject(
        new ApiError({
          message: `Upload failed with status ${xhr.status}`,
          statusCode: xhr.status,
          error: 'UploadError',
        })
      );
    });

    xhr.addEventListener('error', () => {
      reject(
        new ApiError({
          message: 'Network error during upload',
          statusCode: 0,
          error: 'UploadError',
        })
      );
    });

    xhr.addEventListener('abort', () => {
      reject(
        new ApiError({
          message: 'Upload aborted',
          statusCode: 0,
          error: 'UploadAborted',
        })
      );
    });

    if (options.signal) {
      if (options.signal.aborted) {
        // Не `xhr.abort()`: в состоянии OPENED, до `send`, настоящий XHR события `abort`
        // не выдаёт вовсе — промис не разрешился бы никогда, и экран замер бы на «0%».
        reject(new ApiError({ message: 'Upload aborted', statusCode: 0, error: 'UploadAborted' }));
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
};
