import { describe, expect, it } from 'vitest';
import { readingMinutes } from '@/lib/utils/reading-time';

/** Время чтения — одно правило на страницу `/summary` и вкладку админки (F04). */
describe('readingMinutes', () => {
  it('минуты: 230 слов в минуту, не меньше одной, пустой текст - 0', () => {
    expect(readingMinutes('')).toBe(0);
    expect(readingMinutes('one two')).toBe(1);
    expect(readingMinutes(Array(2300).fill('w').join(' '))).toBe(10);
  });
});
