import { describe, it, expect, vi } from 'vitest';
import { handleContentFailure, isNotFoundError } from '@/lib/utils/content-failure';
import { ApiError } from '@/types/api';

const apiError = (statusCode: number) =>
  new ApiError({ message: 'boom', statusCode, error: 'Error' });

describe('isNotFoundError', () => {
  it('recognises the API saying the entity does not exist', () => {
    expect(isNotFoundError(apiError(404))).toBe(true);
  });

  it('does not mistake an outage for a missing entity', () => {
    expect(isNotFoundError(apiError(500))).toBe(false);
    expect(isNotFoundError(apiError(502))).toBe(false);
    expect(isNotFoundError(new Error('ECONNREFUSED'))).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
  });
});

describe('handleContentFailure', () => {
  it('turns a 404 into notFound()', () => {
    const notFound = vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    }) as unknown as () => never;

    expect(() => handleContentFailure(apiError(404), notFound)).toThrow('NEXT_NOT_FOUND');
  });

  /**
   * The point of the helper. Swallowing this used to render an empty list under
   * a 200, and since a failed count no longer forces noindex that page would be
   * indexable — a confident "this section is empty" published during an outage.
   */
  it('rethrows an outage so the page answers 5xx instead of an empty 200', () => {
    const notFound = vi.fn() as unknown as () => never;

    expect(() => handleContentFailure(apiError(503), notFound)).toThrow('boom');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('rethrows a transport failure too', () => {
    const notFound = vi.fn() as unknown as () => never;
    const network = new Error('fetch failed');

    expect(() => handleContentFailure(network, notFound)).toThrow(network);
    expect(notFound).not.toHaveBeenCalled();
  });
});
