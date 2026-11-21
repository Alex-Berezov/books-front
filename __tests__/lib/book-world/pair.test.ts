import { describe, expect, it } from 'vitest';
import {
  canonicalPairMembers,
  pairDisplayName,
  pairKey,
  pairMembers,
  pairNames,
} from '@/lib/book-world/pair';

/**
 * Ключ пары героев (F08-8c): разбор - копия `pairMembers` из
 * `books/src/modules/book-world/world-refs.ts` (ровно одно `--`, обе половины непусты; порядок и
 * различие героев - отказы `checkWorldPair` бэкенда, не разбора).
 */
describe('pairMembers: как на бэкенде', () => {
  it.each([
    ['anna--tom', ['anna', 'tom']],
    ['anna-lark--tom-reed', ['anna-lark', 'tom-reed']],
    // Порядок и различие разбор не проверяет - как бэкенд.
    ['tom--anna', ['tom', 'anna']],
    ['a--a', ['a', 'a']],
    ['a---b', null],
    ['a----b', null],
    ['a--b--c', null],
    ['--b', null],
    ['a--', null],
    ['--', null],
    ['anna', null],
    ['anna-tom', null],
    ['', null],
  ])('%s → %j', (key, expected) => {
    expect(pairMembers(key)).toEqual(expected);
  });
});

describe('pairKey: по алфавиту по коду символа', () => {
  it.each([
    ['anna', 'tom', 'anna--tom'],
    ['tom', 'anna', 'anna--tom'],
    // Цифра раньше буквы, дефис раньше цифры: код символа, не локаль и не числа.
    ['b', '9', '9--b'],
    ['a-b', 'a1', 'a-b--a1'],
    ['item10', 'item9', 'item10--item9'],
  ])('%s + %s → %s', (x, y, expected) => {
    expect(pairKey(x, y)).toBe(expected);
  });
});

describe('canonicalPairMembers: канонический ключ, как checkWorldPair бэкенда', () => {
  it.each([
    ['anna--tom', ['anna', 'tom']],
    ['anna-lark--tom-reed', ['anna-lark', 'tom-reed']],
    // Ключи с цифрами и дефисом: порядок по коду символа (дефис < цифра < буква).
    ['9--b', ['9', 'b']],
    ['a-1--a1', ['a-1', 'a1']],
    ['item10--item9', ['item10', 'item9']],
    // Не по алфавиту, один герой дважды, кривой разбор - не страница пары.
    ['tom--anna', null],
    ['b--9', null],
    ['item9--item10', null],
    ['a--a', null],
    ['a---b', null],
    ['anna', null],
  ])('%s → %j', (key, expected) => {
    expect(canonicalPairMembers(key)).toEqual(expected);
  });
});

describe('pairDisplayName', () => {
  const names = new Map([
    ['anna', 'Anna'],
    ['tom', 'Tom'],
  ]);
  const nameOf = (k: string) => names.get(k);

  it('имена в порядке ключа по формуле языка', () => {
    expect(pairDisplayName('{a} and {b}', 'anna--tom', nameOf, 'Pair')).toBe('Anna and Tom');
  });

  it('нет имени героя или кривой ключ - имя сущности', () => {
    expect(pairDisplayName('{a} and {b}', 'anna--zed', nameOf, 'Pair')).toBe('Pair');
    expect(pairDisplayName('{a} and {b}', 'anna---tom', nameOf, 'Pair')).toBe('Pair');
  });

  it('имя героя из пробелов - имя сущности, а не «   and Tom»', () => {
    const blank = (k: string) => (k === 'anna' ? '   ' : names.get(k));
    expect(pairDisplayName('{a} and {b}', 'anna--tom', blank, 'Pair')).toBe('Pair');
    expect(pairNames('{a} and {b}', ['   ', 'Tom'], 'Pair')).toBe('Pair');
    expect(pairNames('{a} and {b}', ['Anna', '   '], 'Pair')).toBe('Pair');
  });
});
