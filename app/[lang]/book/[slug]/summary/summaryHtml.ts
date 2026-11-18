import { linkHtml, type LinkSession } from '@/lib/book-world/link-entities';
import { anchorHeadings, demoteH1, type HeadingAnchor } from '@/lib/utils/heading-anchors';
import { sanitizeRichHtml } from '@/lib/utils/rich-html';

/** Префикс якорей разделов пересказа: тот же у оглавления и у `RichTextContent`. */
const SUMMARY_ANCHOR_PREFIX = 'part';

/** Якорь блока «Герои книги» на странице пересказа. */
export const SUMMARY_HEROES_ANCHOR = 'summary-heroes';

/** С какого числа разделов `h2` в сайдбаре появляется оглавление. */
const SUMMARY_TOC_MIN_SECTIONS = 2;

/**
 * Текст пересказа и оглавление одним проходом: чистка, понижение `h1` и якоря заголовков считаются
 * один раз, их `html` уходит в текст, `anchors` - в оглавление (одни и те же якоря).
 *
 * `transform` - для `transformSafeHtml` у `RichTextContent`: он отдаёт уже размеченный `html` того же
 * пересказа (своя чистка `RichTextContent` даёт тот же вход, а `id` якорей санитайзер не пропускает,
 * поэтому разметка - после неё). Перелинковка (F08-5) - внутри `transform`, то есть в рендере
 * (порядок документа, решение арбитра Q9); заголовки ссылками не становятся.
 */
export function prepareSummaryHtml(
  html: string,
  session: LinkSession
): { transform: (safeHtml: string) => string; toc: HeadingAnchor[] } {
  const cleaned = sanitizeRichHtml(html);
  const anchored = anchorHeadings(demoteH1(cleaned), SUMMARY_ANCHOR_PREFIX, 'h2');
  return {
    // Вход - чистка самого `RichTextContent` (тот же результат, что и `sanitizeRichHtml(html)` выше):
    // другой вход разметится заново, а не подменится нашим.
    transform: (safeHtml) =>
      linkHtml(
        safeHtml === cleaned
          ? anchored.html
          : anchorHeadings(demoteH1(safeHtml), SUMMARY_ANCHOR_PREFIX, 'h2').html,
        session
      ),
    toc: anchored.anchors.length >= SUMMARY_TOC_MIN_SECTIONS ? anchored.anchors : [],
  };
}
