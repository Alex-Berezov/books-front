import { decodeEntities } from './html-entities';
import { generateSlug } from './slug';

/**
 * Якоря разделов `h3` в HTML из редактора — для оглавления биографии автора (F02-3,
 * `product.md` §8). Работает **после** санитайзера: белый список `id` не пропускает,
 * и это верно — `id` из данных админки открыли бы DOM clobbering, а здесь их строит
 * наш код (решение арбитра 15.10.2026, `F02 | F02-3`, Р1).
 *
 * Вход — вывод `sanitizeRichHtml`: правильный HTML, у `h3` из атрибутов только `style`.
 */

export interface HeadingAnchor {
  id: string;
  text: string;
}

const H3 = /<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi;

function headingText(inner: string): string {
  return decodeEntities(inner.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Проставляет `h3` уникальные `id` вида `{prefix}-{слаг текста}`; заголовок без букв и цифр —
 * `{prefix}-section-{N}`. Возвращает HTML и список якорей в порядке документа.
 */
export function anchorHeadings(
  html: string,
  prefix: string
): { html: string; anchors: HeadingAnchor[] } {
  const anchors: HeadingAnchor[] = [];
  const used = new Set<string>();
  const out = html.replace(H3, (_whole, attrs: string, inner: string) => {
    const text = headingText(inner);
    const base = generateSlug(text);
    const stem = base ? `${prefix}-${base}` : `${prefix}-section-${anchors.length + 1}`;
    let id = stem;
    for (let n = 2; used.has(id); n += 1) id = `${stem}-${n}`;
    used.add(id);
    anchors.push({ id, text });
    const rest = attrs.replace(/\sid\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return `<h3 id="${id}"${rest}>${inner}</h3>`;
  });
  return { html: out, anchors };
}
