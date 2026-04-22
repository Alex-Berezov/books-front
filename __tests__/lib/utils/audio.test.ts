import { describe, it, expect } from 'vitest';
import { formatDuration, validateUploadFile } from '@/lib/utils/audio';

describe('formatDuration', () => {
  it('returns placeholder for null/undefined/negative/non-finite', () => {
    expect(formatDuration(null)).toBe('--:--');
    expect(formatDuration(undefined)).toBe('--:--');
    expect(formatDuration(-5)).toBe('--:--');
    expect(formatDuration(Number.NaN)).toBe('--:--');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('--:--');
  });

  it('formats sub-hour durations as m:ss with zero-padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(599)).toBe('9:59');
  });

  it('formats >= 1h durations as h:mm:ss', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7384)).toBe('2:03:04');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(65.9)).toBe('1:05');
    expect(formatDuration(3600.7)).toBe('1:00:00');
  });
});

describe('validateUploadFile', () => {
  const limits = {
    maxSizeMb: 2,
    allowedContentTypes: ['audio/mpeg', 'audio/mp4'],
  };

  const makeFile = (size: number, type: string): File => {
    // Jsdom File honors .size and .type from the blob parts/options.
    const blob = new Blob([new Uint8Array(size)], { type });
    return new File([blob], 'track.mp3', { type });
  };

  it('returns null for a valid file', () => {
    expect(validateUploadFile(makeFile(1024, 'audio/mpeg'), limits)).toBeNull();
  });

  it('rejects unsupported MIME types', () => {
    const err = validateUploadFile(makeFile(1024, 'image/png'), limits);
    expect(err).toMatch(/Unsupported file type/);
    expect(err).toContain('audio/mpeg');
  });

  it('reports "unknown" when the file has no type', () => {
    const err = validateUploadFile(makeFile(1024, ''), limits);
    expect(err).toMatch(/unknown/);
  });

  it('rejects files above the size limit', () => {
    const tooBig = makeFile(3 * 1024 * 1024, 'audio/mpeg');
    const err = validateUploadFile(tooBig, limits);
    expect(err).toMatch(/too large/i);
    expect(err).toContain('2 MB');
  });

  it('accepts files exactly at the size limit', () => {
    const exact = makeFile(2 * 1024 * 1024, 'audio/mpeg');
    expect(validateUploadFile(exact, limits)).toBeNull();
  });
});
