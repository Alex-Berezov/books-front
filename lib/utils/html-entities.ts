/**
 * Расшифровка HTML-сущностей в тексте, снятом с HTML редактора: описание страницы автора из
 * биографии и подписи оглавления (F02-1, F02-3) — одна таблица на оба места.
 */
const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

/** Именованные сущности из списка выше и любые числовые (`&#8217;`, `&#x2014;`). */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code =
        name[1] === 'x' || name[1] === 'X'
          ? parseInt(name.slice(2), 16)
          : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return HTML_ENTITIES[name.toLowerCase()] ?? whole;
  });
}
