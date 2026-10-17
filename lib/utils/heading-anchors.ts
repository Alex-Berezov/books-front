import { decodeEntities } from './html-entities';
import { generateSlug } from './slug';

/**
 * Якоря разделов в HTML из редактора — для оглавления биографии автора (`h3`, F02-3,
 * `product.md` §8) и пересказа книги (`h2`). Работает **после** санитайзера: белый список `id` не пропускает,
 * и это верно — `id` из данных админки открыли бы DOM clobbering, а здесь их строит
 * наш код (решение арбитра 15.10.2026, `F02 | F02-3`, Р1).
 *
 * Вход — вывод `sanitizeRichHtml`: правильный HTML, у заголовка из атрибутов только `style`.
 */

export interface HeadingAnchor {
  id: string;
  text: string;
}

export type AnchoredHeading = 'h2' | 'h3';

const HEADING_PATTERNS: Record<AnchoredHeading, RegExp> = {
  h2: /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi,
  h3: /<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi,
};

function headingText(inner: string): string {
  return decodeEntities(inner.replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Проставляет заголовкам `tag` (по умолчанию `h3`) уникальные `id` вида `{prefix}-{слаг текста}`; заголовок без букв и цифр —
 * `{prefix}-section-{N}`. Возвращает HTML и список якорей в порядке документа.
 */
export function anchorHeadings(
  html: string,
  prefix: string,
  tag: AnchoredHeading = 'h3'
): { html: string; anchors: HeadingAnchor[] } {
  const anchors: HeadingAnchor[] = [];
  const used = new Set<string>();
  const out = html.replace(HEADING_PATTERNS[tag], (_whole, attrs: string, inner: string) => {
    const text = headingText(inner);
    const base = generateSlug(text);
    const stem = base ? `${prefix}-${base}` : `${prefix}-section-${anchors.length + 1}`;
    let id = stem;
    for (let n = 2; used.has(id); n += 1) id = `${stem}-${n}`;
    used.add(id);
    anchors.push({ id, text });
    const rest = attrs.replace(/\sid\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return `<${tag} id="${id}"${rest}>${inner}</${tag}>`;
  });
  return { html: out, anchors };
}
