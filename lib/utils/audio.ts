/**
 * Audio utilities for the admin upload flow.
 *
 * All helpers are client-only (use `HTMLAudioElement` / `URL.createObjectURL`).
 */

/**
 * Probe the duration of an audio file in the browser.
 *
 * Loads the file as a blob URL into a detached `HTMLAudioElement` and waits
 * for the `loadedmetadata` event. The duration is returned in seconds,
 * rounded to the nearest integer (matches the backend `duration` field).
 *
 * Falls back to `null` if the browser cannot parse the file (unsupported
 * codec, corrupted file, `Infinity` duration for some streamed MP3s).
 */
export const detectAudioDuration = (file: File): Promise<number | null> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      resolve(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.src = '';
    };

    audio.addEventListener(
      'loadedmetadata',
      () => {
        const raw = audio.duration;
        cleanup();
        if (!Number.isFinite(raw) || raw <= 0) {
          resolve(null);
          return;
        }
        resolve(Math.round(raw));
      },
      { once: true }
    );

    audio.addEventListener(
      'error',
      () => {
        cleanup();
        resolve(null);
      },
      { once: true }
    );

    audio.src = objectUrl;
  });
};

/**
 * Format a duration (seconds) as `m:ss` or `h:mm:ss`.
 *
 * Returns `--:--` for null/negative/non-finite values — handy for "duration
 * still being probed" UI states.
 */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return '--:--';
  }

  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
};

/**
 * Validate a file against an upload-limits category (size + MIME).
 *
 * Returns a human-readable error message or `null` if the file passes.
 */
export const validateUploadFile = (
  file: File,
  limits: { maxSizeMb: number; allowedContentTypes: string[] }
): string | null => {
  if (!limits.allowedContentTypes.includes(file.type)) {
    const allowed = limits.allowedContentTypes.join(', ');
    return `Unsupported file type "${file.type || 'unknown'}". Allowed: ${allowed}.`;
  }

  const maxBytes = limits.maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File is too large. Max size: ${limits.maxSizeMb} MB.`;
  }

  return null;
};
