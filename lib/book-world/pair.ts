import { fillTemplate } from './format';

/**
 * Пара героев мира книги (F08-8c, `tech.md` §3): ключ `{a}--{b}`, герои по алфавиту. Чистые функции
 * без React и API: ключ пары, разбор ключа и имя пары для h1, title и подписей.
 */

/** Разделитель героев в ключе пары. */
export const PAIR_KEY_SEPARATOR = '--';

/**
 * Герои ключа пары `{a}--{b}`: ровно одно `--`, обе половины непустые; иначе `null`. Сам разбор
 * порядок и различие героев не проверяет (`a--a` и `b--a` разбираются): канонический вид ключа -
 * `canonicalPairMembers` ниже (по правилу `checkWorldPair` бэкенда).
 * Копия pairMembers из books/src/modules/book-world/world-refs.ts; менять вместе.
 */
export function pairMembers(key: string): [string, string] | null {
  const at = key.indexOf(PAIR_KEY_SEPARATOR);
  if (at <= 0 || at !== key.lastIndexOf(PAIR_KEY_SEPARATOR)) return null;
  const a = key.slice(0, at);
  const b = key.slice(at + PAIR_KEY_SEPARATOR.length);
  return b === '' ? null : [a, b];
}

/**
 * Ключ пары двух героев: по алфавиту по коду символа (`a < b` строк JS, как на бэкенде - без локали и
 * числового сравнения), порядок аргументов не важен.
 * Копия правила порядка и различия героев из checkWorldPair (books/src/modules/book-world/world-refs.ts);
 * менять вместе.
 */
export function pairKey(x: string, y: string): string {
  return x < y ? `${x}${PAIR_KEY_SEPARATOR}${y}` : `${y}${PAIR_KEY_SEPARATOR}${x}`;
}

/**
 * Герои ключа пары в каноническом виде `{a}--{b}`: разбирается, герои разные, порядок - по
 * `pairKey`; иначе `null` - страницы и ссылки у такой пары нет.
 * Копия правила порядка и различия героев из checkWorldPair (books/src/modules/book-world/world-refs.ts);
 * менять вместе.
 */
export function canonicalPairMembers(key: string): [string, string] | null {
  const members = pairMembers(key);
  return members !== null && members[0] !== members[1] && pairKey(...members) === key
    ? members
    : null;
}

/** Имя пары в тексте: «{a} и {b}» формулой языка; нет имени одного из героев - имя сущности как есть. */
export function pairNames(
  template: string,
  names: readonly [string | undefined, string | undefined],
  fallback: string
): string {
  const [a, b] = names;
  return a && b ? fillTemplate(template, { a, b }) : fallback;
}

/**
 * Имя пары по её ключу для h1, хлебной крошки, title и ссылок с героя: имена героев ключа в порядке
 * ключа из `nameOf` (страница и мета передают одно и то же - `buildWorldPeople`); ключ не разбирается
 * или имени нет - `fallback` (имя сущности пары).
 */
export function pairDisplayName(
  template: string,
  key: string,
  nameOf: (key: string) => string | undefined,
  fallback: string
): string {
  const members = pairMembers(key);
  return members
    ? pairNames(template, [nameOf(members[0]), nameOf(members[1])], fallback)
    : fallback;
}
