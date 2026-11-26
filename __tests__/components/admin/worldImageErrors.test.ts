import { describe, expect, it } from 'vitest';
import { worldImageRequestErrorText } from '@/components/admin/books/WorldTab/worldImageErrors';
import {
  WORLD_IMAGE_FILE_LIMITS,
  WORLD_PLACE_IMAGE_FILE_LIMITS,
} from '@/lib/admin/book-world-blocks';
import { ApiError } from '@/types/api';

/**
 * F08-11c (хвост ревью 11b): коды отказа ручек иллюстрации в человеческие фразы. С F08-11d
 * генерации нет: остались отказы «Accept»; с F08-11d-3 — и отказы загрузки файла.
 */

// Копии пределов `books/src/modules/translation/world-image/world-image.constants.ts`
// (`WORLD_IMAGE_LIMITS`, `WORLD_PLACE_IMAGE_LIMITS`, F08-12c-2): числа закреплены здесь, change both together.
describe('world image file limits (numbers pinned here, the backend copy is not read)', () => {
  it('a portrait from 1200×1200, a place from 1200×675; the file and pixels are shared', () => {
    expect(WORLD_IMAGE_FILE_LIMITS).toMatchObject({ maxMb: 12, minSide: 1200, maxMegapixels: 40 });
    expect(WORLD_PLACE_IMAGE_FILE_LIMITS).toEqual({
      maxMb: 12,
      minWidth: 1200,
      minHeight: 675,
      maxMegapixels: 40,
      types: ['image/png', 'image/jpeg', 'image/webp'],
    });
  });
});

describe('worldImageRequestErrorText', () => {
  const refusal = (code: string) =>
    new ApiError({ statusCode: 409, message: 'server text', data: { code } });

  it.each([
    ['WORLD_IMAGE_NOT_ALLOWED', 'places and main or secondary characters'],
    ['WORLD_IMAGE_KEY_CONFLICT', 'already holds the illustration of another entity'],
    ['WORLD_IMAGE_NONE', 'no illustration waiting for Accept'],
    ['WORLD_IMAGE_CHANGED', 'replaced meanwhile'],
    ['WORLD_IMAGE_ENTITY_CHANGED', 'The entity type changed meanwhile'],
    ['WORLD_IMAGE_NOT_IMAGE', 'not a PNG, JPEG or WebP'],
    ['WORLD_IMAGE_TOO_LARGE', 'up to 12 MB and 40 megapixels'],
    [
      'WORLD_IMAGE_TOO_SMALL',
      'a character needs at least 1200×1200 px, a place at least 1200×675 px',
    ],
  ])('%s is its own phrase, not the server text', (code, part) => {
    const text = worldImageRequestErrorText(refusal(code));
    expect(text).toContain(part);
    expect(text).not.toContain('server text');
  });

  it.each(['WORLD_IMAGE_IN_PROGRESS', 'WORLD_IMAGE_NO_APPEARANCE'])(
    '%s of the removed generation has no phrase of its own: the server text as is',
    (code) => {
      expect(worldImageRequestErrorText(refusal(code))).toContain('server text');
    }
  );

  it('a common LLM refusal: the shared phrase, not the server text', () => {
    expect(worldImageRequestErrorText(refusal('LLM_CEILING_REACHED'))).not.toContain('server text');
  });

  it.each([
    ['character', 'at least 1200×1200 px', '1200×675'],
    ['place', 'at least 1200×675 px', '1200×1200'],
  ])('WORLD_IMAGE_TOO_SMALL for a %s names only its limit', (type, part, other) => {
    const text = worldImageRequestErrorText(refusal('WORLD_IMAGE_TOO_SMALL'), type);
    expect(text).toContain(part);
    expect(text).not.toContain(other);
  });

  it('unknown code: the server text as is', () => {
    expect(worldImageRequestErrorText(refusal('SOMETHING_NEW'))).toContain('server text');
  });
});
