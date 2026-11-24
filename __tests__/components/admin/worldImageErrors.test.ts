import { describe, expect, it } from 'vitest';
import { worldImageRequestErrorText } from '@/components/admin/books/WorldTab/worldImageErrors';
import { ApiError } from '@/types/api';

/**
 * F08-11c (хвост ревью 11b): коды отказа ручек иллюстрации в человеческие фразы. С F08-11d
 * генерации нет: остались только отказы «Accept».
 */

describe('worldImageRequestErrorText', () => {
  const refusal = (code: string) =>
    new ApiError({ statusCode: 409, message: 'server text', data: { code } });

  it.each([
    ['WORLD_IMAGE_NOT_ALLOWED', 'main and secondary'],
    ['WORLD_IMAGE_NONE', 'no illustration waiting for Accept'],
    ['WORLD_IMAGE_CHANGED', 'replaced meanwhile'],
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

  it('unknown code: the server text as is', () => {
    expect(worldImageRequestErrorText(refusal('SOMETHING_NEW'))).toContain('server text');
  });
});
