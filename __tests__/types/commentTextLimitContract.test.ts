// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMMENT_TEXT_MAX_LENGTH } from '@/lib/constants/comments';

/**
 * LEGACY-462: предел текста комментария задаёт бэкенд (`@MaxLength`), форма ответа админки держит
 * копию числа. Тело запроса type-sync не сверяет, поэтому разъезд ловит этот тест по снимку схемы.
 */
describe('контракт комментария: предел текста', () => {
  it('константа фронта совпадает с maxLength текста в снимке схемы бэкенда', () => {
    const schema = JSON.parse(
      readFileSync(resolve(__dirname, '../../scripts/type-sync/api-schema.json'), 'utf8')
    );
    expect(schema.components.schemas.CreateCommentDto.properties.text.maxLength).toBe(
      COMMENT_TEXT_MAX_LENGTH
    );
    expect(schema.components.schemas.UpdateCommentDto.properties.text.maxLength).toBe(
      COMMENT_TEXT_MAX_LENGTH
    );
  });
});
