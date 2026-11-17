import { describe, expect, it } from 'vitest';
import {
  chapterFromSearchParams,
  parseChapterParam,
} from '@/app/[lang]/book/[slug]/read/chapterParam';

// Обёртка читалки над общим правилом номера (F04 T3): параметр `chapter` строки запроса.
describe('parseChapterParam', () => {
  it.each([
    ['?chapter=3', 3],
    ['?x=1&chapter=12', 12],
    ['?chapter=03', null],
    ['?chapter=', null],
    ['?chapters=3', null],
    ['', null],
  ])('%j -> %j', (search, expected) => {
    expect(parseChapterParam(search)).toBe(expected);
  });
});

// Серверные страницы читалки и плеера: одна функция на обе (F08-3b).
describe('chapterFromSearchParams', () => {
  it.each([
    [{ chapter: '3' }, 3],
    [{ chapter: '03' }, null],
    [{ chapter: ['1', '2'] }, null],
    [{ chapter: 'abc' }, null],
    [{}, null],
  ])('%j -> %j', (search, expected) => {
    expect(chapterFromSearchParams(search)).toBe(expected);
  });
});
