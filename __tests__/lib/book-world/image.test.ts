import { describe, expect, it } from 'vitest';
import { worldImageSize } from '@/lib/book-world/image';

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
});
