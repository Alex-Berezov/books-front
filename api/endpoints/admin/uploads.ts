/**
 * Admin upload endpoints: сборка `MediaAsset` поверх общих примитивов из
 * `api/endpoints/uploads.ts`.
 *
 *   Variant A (one-step, small files):
 *     POST /media/upload (multipart)          → MediaAsset
 *
 *   Variant B (presigned, recommended for audio):
 *     presign → direct → confirm (общие функции) → POST /media/confirm → MediaAsset
 *
 * `uploadAudioFile` orchestrates Variant B with an `onProgress` callback so
 * callers can drive a progress bar.
 */

import { presignUpload, resolveUploadedUrl, sendPresignedBody } from '@/api/endpoints/uploads';
import { BACKEND_PROXY_REQUEST_HEADERS, backendProxyUrl } from '@/lib/http';
import { httpPostAuth, requireLiveSession } from '@/lib/http-client';
import { ApiError } from '@/types/api';
import type { UploadProgressOptions } from '@/api/endpoints/uploads';
import type { ConfirmUploadRequest, MediaAsset } from '@/types/api-schema';

/**
 * Confirm a completed presigned upload — triggers ffprobe on the backend.
 */
export const confirmUpload = async (data: ConfirmUploadRequest): Promise<MediaAsset> => {
  return httpPostAuth<MediaAsset>('/media/confirm', data);
};

/**
 * Full audio-upload flow (Variant B) with progress reporting.
 *
 * 1. `POST /uploads/presign` — obtain the upload URL + scoped token.
 *    Backend generates the storage key; we only declare `type: 'audio'`.
 * 2. `POST /uploads/direct` — stream the file (XHR, progress events,
 *    `X-Upload-Token` header).
 * 3. `POST /uploads/confirm?key=…` — resolve the public URL for the key.
 * 4. `POST /media/confirm` — create/update `MediaAsset`, kicks off ffprobe.
 *
 * Note: `MediaAsset.duration` may still be `null` right after confirm —
 * re-fetch the asset (or rely on ffprobe settling within ~500 ms) if the
 * caller needs the duration for display. For writing `duration` into an
 * `AudioChapter` we prefer the client-side value from `detectAudioDuration`.
 */
export const uploadAudioFile = async (
  file: File,
  options: UploadProgressOptions = {}
): Promise<MediaAsset> => {
  const contentType = file.type || 'audio/mpeg';

  const presign = await presignUpload({
    type: 'audio',
    contentType,
    size: file.size,
  });

  await sendPresignedBody(presign, contentType, file, options);

  const { publicUrl } = await resolveUploadedUrl(presign.key);

  return confirmUpload({
    key: presign.key,
    url: publicUrl,
    contentType,
    size: file.size,
  });
};

/**
 * One-step multipart upload (Variant A) with progress reporting.
 *
 * Uses XHR so the UI can display a progress bar. Prefer `uploadAudioFile`
 * for audio so the backend triggers ffprobe on `confirm`.
 */
export const uploadMediaMultipart = async (
  file: File,
  options: UploadProgressOptions = {}
): Promise<MediaAsset> => {
  // Без живой сессии — 401 до отправки тела. Токен добавляет серверный прокси (`LEGACY-465`).
  await requireLiveSession();

  return new Promise<MediaAsset>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', backendProxyUrl('/media/upload'), true);
    for (const [name, value] of Object.entries(BACKEND_PROXY_REQUEST_HEADERS)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.responseType = 'json';

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
        resolve(xhr.response as MediaAsset);
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
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
};
