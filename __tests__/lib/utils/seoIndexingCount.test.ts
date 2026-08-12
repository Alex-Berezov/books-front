import { describe, it, expect } from 'vitest';
import {
  buildRobotsByCount,
  describeBundleFailure,
  robotsForUnreadableBundle,
  toCountResult,
  UnknownIndexabilityError,
  type CountResult,
} from '@/lib/utils/seo-indexing';
import { ApiError } from '@/types/api';

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

/**
 * `LEGACY-074`. 08.08.2026 четыре страницы терминов подряд отдали 5xx с
 * сообщением «бандл не прочитался» — и по логу нельзя было понять, отказал ли
 * вызов к API или бандл пришёл неполным. Это два разных дефекта с разной
 * починкой; различить их можно только в момент отказа.
 *
 * Само решение отвечать 5xx не проверяется здесь заново — оно правильное и
 * закреплено соседними тестами. Проверяется только диагностика.
 */
describe('describeBundleFailure (LEGACY-074)', () => {
  it('называет код ответа, когда отказал API', () => {
    const apiError = new ApiError({ statusCode: 429, message: 'Too Many Requests' });
    expect(describeBundleFailure(apiError)).toBe('API ответил 429');
  });

  it('отличает 5xx от 429 — это разные причины с разной починкой', () => {
    const apiError = new ApiError({ statusCode: 503, message: 'Service Unavailable' });
    expect(describeBundleFailure(apiError)).toBe('API ответил 503');
  });

  it('называет неполноту бандла, когда до поля дошли, а поля нет', () => {
    const shapeError = new TypeError("Cannot read properties of undefined (reading 'twitter')");
    expect(describeBundleFailure(shapeError)).toContain('бандл неполон');
  });

  /**
   * 🔴 `fetch` в undici бросает именно `TypeError: fetch failed`, когда хост
   * недоступен. Первая версия функции ловила его веткой формы и объявляла
   * «бандл неполон» — переворачивая диагноз ровно наоборот. Тест краснеет от
   * возврата этой ветки.
   */
  it('не выдаёт сетевой отказ undici за неполный бандл', () => {
    const network = new TypeError('fetch failed');
    (network as { cause?: unknown }).cause = new Error('ECONNREFUSED 10.0.0.1:443');

    const described = describeBundleFailure(network);
    expect(described).toContain('сеть недоступна');
    expect(described).not.toContain('бандл неполон');
  });

  it('вытаскивает настоящую причину из cause, а не только «fetch failed»', () => {
    const network = new TypeError('fetch failed');
    (network as { cause?: unknown }).cause = new Error('ETIMEDOUT');
    expect(describeBundleFailure(network)).toContain('ETIMEDOUT');
  });

  it('узнаёт сетевой отказ и без cause — по сообщению', () => {
    expect(describeBundleFailure(new TypeError('fetch failed'))).toContain('сеть недоступна');
  });

  it('сохраняет класс ошибки для прочих отказов', () => {
    const other = new Error('socket hang up');
    other.name = 'FetchError';
    expect(describeBundleFailure(other)).toBe('FetchError: socket hang up');
  });

  it('не падает на не-Error', () => {
    expect(describeBundleFailure('boom')).toBe('boom');
  });
});

describe('UnknownIndexabilityError несёт причину (LEGACY-074)', () => {
  it('дописывает причину в сообщение — именно оно попадает в лог контейнера', () => {
    const error = new UnknownIndexabilityError(
      'taxonomy-detail',
      'psychological-fiction',
      new ApiError({ statusCode: 429, message: 'Too Many Requests' })
    );

    expect(error.message).toContain('psychological-fiction');
    expect(error.message).toContain('Причина: API ответил 429');
  });

  it('сохраняет исходную ошибку в cause, а не только её пересказ', () => {
    const original = new ApiError({ statusCode: 500, message: 'boom' });
    expect(new UnknownIndexabilityError('taxonomy-detail', 'drama', original).cause).toBe(original);
  });

  it('без причины сообщение остаётся прежним — вызывающие без cause не ломаются', () => {
    const error = new UnknownIndexabilityError('book-detail', 'hamlet');
    expect(error.message).not.toContain('Причина');
    expect(error.cause).toBeUndefined();
  });
});

describe('robotsForUnreadableBundle прокидывает причину (LEGACY-074)', () => {
  it('в 5xx-ветке причина доезжает до сообщения', () => {
    expect(() =>
      robotsForUnreadableBundle(
        'taxonomy-detail',
        undefined,
        'detective-fiction',
        new ApiError({ statusCode: 429, message: 'Too Many Requests' })
      )
    ).toThrow(/Причина: API ответил 429/);
  });

  it('вычислимая половина по-прежнему важнее причины: noindex вместо отказа', () => {
    expect(
      robotsForUnreadableBundle('taxonomy-detail', false, 'tragedy', new Error('timeout'))
    ).toEqual({ index: false, follow: true });
  });
});
