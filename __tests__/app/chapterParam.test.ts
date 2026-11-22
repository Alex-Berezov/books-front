import { describe, expect, it } from 'vitest';
import {
  chapterFromSearchParams,
  parseChapterParam,
  paragraphFromSearchParams,
  parseParagraphParam,
  readerChapterQuery,
  readerSceneHref,
  withoutChapterParam,
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

// Абзац сцены мира книги (F08-10a): `?chapter=N&p=K`.
describe('paragraph param', () => {
  it.each([
    ['?chapter=2&p=4', 4],
    ['?chapter=2&p=04', null],
    ['?chapter=2&p=0', null],
    ['?chapter=2&p=abc', null],
    ['?chapter=2&p=-1', null],
    ['?chapter=2&p=2.5', null],
    ['?chapter=2', null],
  ])('%j -> %j', (search, expected) => {
    expect(parseParagraphParam(search)).toBe(expected);
  });

  it('the scene link carries the paragraph only when there is one', () => {
    expect(readerSceneHref('/en/book/b', 3, 7)).toBe('/en/book/b/read?chapter=3&p=7');
    expect(readerSceneHref('/en/book/b', 3, null)).toBe('/en/book/b/read?chapter=3');
  });

  it('server search params: the same rule, a repeated p is null', () => {
    expect(paragraphFromSearchParams({ p: '3' })).toBe(3);
    expect(paragraphFromSearchParams({ p: ['1', '2'] })).toBeNull();
    expect(paragraphFromSearchParams({})).toBeNull();
  });

  it('the reader query carries p only with a paragraph', () => {
    expect(readerChapterQuery(2)).toBe('?chapter=2');
    expect(readerChapterQuery(2, 5)).toBe('?chapter=2&p=5');
  });

  it('the chapter and the paragraph leave the address together', () => {
    expect(withoutChapterParam('?chapter=3&p=7&utm=x')).toBe('?utm=x');
  });
});
