import { describe, expect, it } from 'vitest';
import { errorCode, errorText, isDataRejected, isServerFailure } from '@/lib/admin/request-errors';
import { ApiError } from '@/types/api';

/** Общий разбор отказа ручки записи админки (Analysis F03-1, World F08-1; круг /fix 1, п.8). */

const api = (statusCode: number, data?: Record<string, unknown>) =>
  new ApiError({ statusCode, message: 'joined, message', data });

describe('request-errors', () => {
  it('errorText: the array of the server check goes line by line, not joined', () => {
    expect(errorText(api(400, { message: ['a.0: bad', 'b: unknown key'] }))).toBe(
      'a.0: bad\nb: unknown key'
    );
    expect(errorText(api(409, { message: 'refused' }))).toBe('joined, message');
    expect(errorText('nope')).toBe('Check failed');
    expect(errorText('nope', 'Request failed')).toBe('Request failed');
  });

  it.each([
    [400, true, false],
    [422, true, false],
    [403, false, false],
    [404, false, false],
    [409, false, false],
    [500, false, true],
    [503, false, true],
  ])('status %i: rejected data %s, server failure %s', (status, rejected, failure) => {
    expect(isDataRejected(api(status))).toBe(rejected);
    expect(isServerFailure(api(status))).toBe(failure);
  });

  it('a network error is neither rejected data nor a server failure', () => {
    expect(isDataRejected(new TypeError('Failed to fetch'))).toBe(false);
    expect(isServerFailure(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('errorCode reads the code of the body; none — null', () => {
    expect(errorCode(api(409, { code: 'WORLD_TEXT_CHANGED' }))).toBe('WORLD_TEXT_CHANGED');
    expect(errorCode(api(409))).toBeNull();
    expect(errorCode(new Error('x'))).toBeNull();
  });
});
