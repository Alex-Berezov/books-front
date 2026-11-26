import { describe, expect, it } from 'vitest';
import { WORLD_PLACE_IMAGE_FILE_LIMITS } from '@/lib/admin/book-world-blocks';
import { worldImageSize, worldImageTypeAllowed } from '@/lib/book-world/image';

/** F08-11c: размеры `next/image` - обе стороны файла или запасной квадрат, но не смесь. */
describe('worldImageSize', () => {
  it.each([
    [
      { width: 1600, height: 1200 },
      { width: 1600, height: 1200 },
    ],
    [
      { width: null, height: null },
      { width: 1200, height: 1200 },
    ],
    [
      { width: 1600, height: null },
      { width: 1200, height: 1200 },
    ],
    [
      { width: null, height: 900 },
      { width: 1200, height: 1200 },
    ],
    [
      { width: 0, height: 0 },
      { width: 1200, height: 1200 },
    ],
  ])('%j -> %j', (file, size) => {
    expect(worldImageSize(file)).toEqual(size);
  });

  // F08-12c-2: у места без размеров - запасной кадр места; он равен пределу места (копия предела,
  // `WORLD_PLACE_IMAGE_FILE_LIMITS`, держится этим тестом).
  it('a place without sizes falls back to the place frame of its limit', () => {
    expect(worldImageSize({ width: null, height: null }, 'place')).toEqual({
      width: WORLD_PLACE_IMAGE_FILE_LIMITS.minWidth,
      height: WORLD_PLACE_IMAGE_FILE_LIMITS.minHeight,
    });
    expect(worldImageSize({ width: 1600, height: 900 }, 'place')).toEqual({
      width: 1600,
      height: 900,
    });
    expect(worldImageSize({ width: null, height: null }, 'character')).toEqual({
      width: 1200,
      height: 1200,
    });
  });
});

describe('worldImageTypeAllowed (copy of the type half of worldImageAllowed, F08-12c-2)', () => {
  it.each([
    ['character', true],
    ['place', true],
    ['pair', false],
    ['object', false],
    ['term', false],
    ['event', false],
  ])('%s -> %s', (type, allowed) => {
    expect(worldImageTypeAllowed(type)).toBe(allowed);
  });
});
