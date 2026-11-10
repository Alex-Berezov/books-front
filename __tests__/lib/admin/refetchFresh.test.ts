import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refetchFresh } from '@/lib/admin/refetch-fresh';

type R = { status: string; dataUpdatedAt: number };
const NOW = 1_000_000;
const FRESH: R = { status: 'success', dataUpdatedAt: NOW };
const STALE: R = { status: 'success', dataUpdatedAt: NOW - 1 };
const FAILED: R = { status: 'error', dataUpdatedAt: 0 };

const answers = (...list: R[]) => {
  const fn = vi.fn<() => Promise<R>>();
  for (const a of list) fn.mockResolvedValueOnce(a);
  return fn;
};

describe('refetchFresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('takes an answer that arrived after the start', async () => {
    const refetch = answers(FRESH);
    expect(await refetchFresh(refetch)).toEqual({ result: FRESH, fresh: true });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('retries once when the first answer is the old data of a cancelled request', async () => {
    const refetch = answers(STALE, FRESH);
    expect((await refetchFresh(refetch))?.fresh).toBe(true);
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('reports stale after two old answers', async () => {
    const refetch = answers(STALE, STALE);
    expect((await refetchFresh(refetch))?.fresh).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry a server failure by default (summary)', async () => {
    const refetch = answers(FAILED, FRESH);
    expect((await refetchFresh(refetch))?.fresh).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('retries a server failure with retryFailure (analysis)', async () => {
    const refetch = answers(FAILED, FRESH);
    expect((await refetchFresh(refetch, { retryFailure: true }))?.fresh).toBe(true);
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when the tab moved to another version meanwhile', async () => {
    const refetch = answers(STALE, FRESH);
    expect(await refetchFresh(refetch, { stillCurrent: () => false })).toBeNull();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('retryFailure: two refusals — not fresh after two calls', async () => {
    const refetch = answers(FAILED, FAILED);
    expect((await refetchFresh(refetch, { retryFailure: true }))?.fresh).toBe(false);
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when the version changed during the retry', async () => {
    const refetch = answers(STALE, FRESH);
    const current = vi.fn<() => boolean>().mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(await refetchFresh(refetch, { stillCurrent: current })).toBeNull();
    expect(refetch).toHaveBeenCalledTimes(2);
  });
});
