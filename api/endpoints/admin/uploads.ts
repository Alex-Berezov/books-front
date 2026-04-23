/**
 * Upload Endpoints
 *
 * Implements the upload flow described in `FRONTEND_ITER2_CONTRACT.md` §4:
 *
 *   Variant A (one-step, small files):
 *     POST /media/upload (multipart)          → MediaAsset
 *
 *   Variant B (presigned, recommended for audio):
 *     POST /uploads/presign        { type, contentType, size }            → { token, uploadUrl, key }
 *     POST /uploads/direct         (binary + X-Upload-Token header)       → 201
 *     POST /uploads/confirm?key=…                                          → { url }
 *     POST /media/confirm          { key, url, contentType, size }        → MediaAsset
 *
 * `uploadAudioFile` orchestrates Variant B with an `onProgress` callback so
 * callers can drive a progress bar.
 */

import { getAccessToken, httpGetAuth, httpPostAuth } from '@/lib/http-client';
import { HTTP_STATUS } from '@/lib/http.constants';
import { ApiError } from '@/types/api';
import type {
  ConfirmUploadRequest,
  MediaAsset,
  PresignUploadRequest,
  PresignUploadResponse,
  UploadLimits,
  UploadsConfirmResponse,
} from '@/types/api-schema';

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
 * Confirm a completed presigned upload — triggers ffprobe on the backend.
 */
export const confirmUpload = async (data: ConfirmUploadRequest): Promise<MediaAsset> => {
  return httpPostAuth<MediaAsset>('/media/confirm', data);
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
 * POST the binary body to a presigned URL using XHR to get upload progress.
 *
 * Auth is conveyed via `X-Upload-Token` (scoped, short-lived).
 * Resolves on HTTP 2xx. Rejects with `ApiError` on non-2xx or transport error.
 */
const uploadBinaryWithProgress = (
  url: string,
  token: string,
  file: File,
  options: UploadProgressOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('X-Upload-Token', token);
    if (file.type) {
      xhr.setRequestHeader('Content-Type', file.type);
    }

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
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
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

  await uploadBinaryWithProgress(presign.uploadUrl, presign.token, file, options);

  const { url } = await resolveUploadedUrl(presign.key);

  return confirmUpload({
    key: presign.key,
    url,
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
  const token = await getAccessToken(true);
  if (!token) {
    throw new ApiError({
      message: 'Authentication required',
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      error: 'Unauthorized',
    });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
  const url = `${apiBaseUrl}/media/upload`;

  return new Promise<MediaAsset>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
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
