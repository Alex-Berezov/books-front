import { describe, it, expect } from 'vitest';
import { buildRobotsByCount, toCountResult, type CountResult } from '@/lib/utils/seo-indexing';

describe('toCountResult', () => {
  it('treats a number as a known count, including zero', () => {
    expect(toCountResult(0)).toEqual({ ok: true, total: 0 });
    expect(toCountResult(12)).toEqual({ ok: true, total: 12 });
  });

  it('treats a missing value as unknown, not as zero', () => {
    expect(toCountResult(null)).toEqual({ ok: false });
    expect(toCountResult(undefined)).toEqual({ ok: false });
  });
});

describe('buildRobotsByCount', () => {
  /**
   * The whole point of the package: a failing API used to be indistinguishable
   * from an empty page, and the page answered 200 + noindex — which Google acts
   * on. No robots tag is the recoverable state; noindex is not.
   */
  it('emits no directive at all when the count is unknown', () => {
    expect(buildRobotsByCount({ ok: false }, false)).toBeUndefined();
    expect(buildRobotsByCount({ ok: false }, true)).toBeUndefined();
  });

  it('noindexes a page that is genuinely empty', () => {
    expect(buildRobotsByCount({ ok: true, total: 0 }, false)).toEqual({
      index: false,
      follow: true,
    });
  });

  it('indexes a page that has content', () => {
    expect(buildRobotsByCount({ ok: true, total: 10 }, false)).toEqual({
      index: true,
      follow: true,
    });
  });

  it('noindexes a page past the last pagination page', () => {
    expect(buildRobotsByCount({ ok: true, total: 10 }, true)).toEqual({
      index: false,
      follow: true,
    });
  });

  it('always keeps follow, so link equity flows even from a dropped page', () => {
    const cases: CountResult[] = [
      { ok: true, total: 0 },
      { ok: true, total: 5 },
    ];
    for (const count of cases) {
      expect(buildRobotsByCount(count, false)?.follow).toBe(true);
    }
  });
});
