/**
 * Закрывает ли строка robots страницу от индекса: токен `noindex` или `none` (F04 `tech.md` §4).
 *
 * Фронтовая копия бэкендового `robotsHasNoindex` (`books/src/shared/seo/term-indexable.util.ts`):
 * им бэкенд выкидывает книгу с `noindex` из карты разделов пересказа, этим - страница раздела
 * ставит `noindex`. Разойдутся - раздел без строки в карте окажется открыт, или наоборот. Набор
 * случаев в тестах обеих сторон общий; меняешь правило - меняй в обеих.
 *
 * Разбор: нижний регистр, по запятой и пробелам, префикс бота (`googlebot: noindex`) снимается,
 * значение директивы (`max-image-preview:none`) токеном не становится, за датой `unavailable_after`
 * читаются только `noindex`/`none`/`nofollow`.
 */

const DATE_TAIL_DIRECTIVES = new Set(['noindex', 'none', 'nofollow']);

const VALUE_DIRECTIVES = new Set([
  'max-snippet',
  'max-image-preview',
  'max-video-preview',
  'unavailable_after',
]);

function robotsTokens(robots: string | null | undefined): string[] {
  const tokens: string[] = [];
  for (const part of (robots ?? '').toLowerCase().split(',')) {
    let rest = part.trim();
    while (rest !== '') {
      const named = /^([a-z0-9_-]+)\s*:\s*/.exec(rest);
      if (named && VALUE_DIRECTIVES.has(named[1])) {
        tokens.push(named[1]);
        if (named[1] === 'unavailable_after') {
          const value = rest.slice(named[0].length).split(/\s+/);
          tokens.push(...value.filter((word) => DATE_TAIL_DIRECTIVES.has(word)));
          break;
        }
        rest = rest.slice(named[0].length).replace(/^\S*\s*/, '');
        continue;
      }
      if (named) {
        rest = rest.slice(named[0].length);
        continue;
      }
      const word = /^\S+/.exec(rest)?.[0] ?? rest;
      tokens.push(word);
      rest = rest.slice(word.length).trimStart();
    }
  }
  return tokens;
}

export function robotsHasNoindex(robots: string | null | undefined): boolean {
  return robotsTokens(robots).some((token) => token === 'noindex' || token === 'none');
}
