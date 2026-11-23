import { describe, expect, it } from 'vitest';
import {
  worldImageFailedText,
  worldImageReasonText,
  worldImageRequestErrorText,
} from '@/components/admin/books/WorldTab/worldImageErrors';
import { ApiError } from '@/types/api';

/** F08-11c (хвост ревью 11b): таблица кодов отказа иллюстрации в человеческие фразы. */

describe('worldImageFailedText', () => {
  it.each([
    ['WORLD_IMAGE_NOT_IMAGE', 'not a PNG'],
    ['WORLD_IMAGE_TOO_SMALL', '1200 px'],
    ['WORLD_IMAGE_TOO_LARGE', 'too large'],
    ['WORLD_IMAGE_INPUT_MISSING', 'no longer has appearance'],
    ['LLM_INSUFFICIENT_FUNDS', 'balance is too low'],
    ['LLM_UNAVAILABLE', 'unavailable'],
    ['LLM_BUDGET_EXCEEDED:operation', 'its limit'],
    ['LLM_BUDGET_EXCEEDED:ceiling', 'ceiling is reached'],
  ])('%s is a phrase', (code, part) => {
    expect(worldImageFailedText({ failedReason: code })).toContain(part);
  });

  it('no code: the general phrase; unknown code: shown as is', () => {
    expect(worldImageFailedText({ failedReason: null })).toBe('The generation failed.');
    expect(worldImageFailedText({ failedReason: 'SOMETHING_NEW' })).toBe(
      'The generation failed: SOMETHING_NEW.'
    );
  });
});

describe('worldImageReasonText', () => {
  it('known code: a phrase; unknown: the code', () => {
    expect(worldImageReasonText('LLM_UNAVAILABLE')).toContain('unavailable');
    expect(worldImageReasonText('SOMETHING_NEW')).toBe('Reason: SOMETHING_NEW.');
  });
});

describe('worldImageRequestErrorText', () => {
  const refusal = (code: string) =>
    new ApiError({ statusCode: 409, message: 'server text', data: { code } });

  it.each([
    ['WORLD_IMAGE_IN_PROGRESS', 'already running'],
    ['WORLD_IMAGE_NOT_ALLOWED', 'main and secondary'],
    ['WORLD_IMAGE_NO_APPEARANCE', 'no appearance text'],
    ['WORLD_IMAGE_NONE', 'no generated illustration'],
    ['WORLD_IMAGE_CHANGED', 'regenerated meanwhile'],
  ])('%s is its own phrase, not the server text', (code, part) => {
    const text = worldImageRequestErrorText(refusal(code));
    expect(text).toContain(part);
    expect(text).not.toContain('server text');
  });

  it('a common LLM refusal: the shared phrase, not the server text', () => {
    expect(worldImageRequestErrorText(refusal('LLM_CEILING_REACHED'))).not.toContain('server text');
  });

  it('unknown code: the server text as is', () => {
    expect(worldImageRequestErrorText(refusal('SOMETHING_NEW'))).toContain('server text');
  });
});
