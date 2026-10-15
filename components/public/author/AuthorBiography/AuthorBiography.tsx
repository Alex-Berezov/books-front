import { RichTextContent } from '@/components/common/RichTextContent';
import { createTranslator } from '@/lib/i18n/translate';
import { anchorHeadings } from '@/lib/utils/heading-anchors';
import { sanitizeRichHtml } from '@/lib/utils/rich-html';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './AuthorBiography.module.scss';

interface AuthorBiographyProps {
  lang: SupportedLang;
  biography: string | null | undefined;
}

/** Префикс якорей разделов: тот же у оглавления и у `RichTextContent`. */
const BIOGRAPHY_ANCHOR_PREFIX = 'bio';

const anchorBiographyHeadings = (safeHtml: string) =>
  anchorHeadings(safeHtml, BIOGRAPHY_ANCHOR_PREFIX).html;

/** С какого числа разделов `h3` над биографией появляется оглавление (`product.md` §8). */
const BIOGRAPHY_TOC_MIN_SECTIONS = 3;

/** Старая биография без разметки блоков — текст с переводами строк, их держит `pre-line`. */
const BLOCK_MARKUP = /<(p|h[1-6]|ul|ol|li|figure|blockquote|pre)\b/i;

/**
 * Биография (`product.md` F02, §8): HTML из админки, разделы `h3`, при трёх и более —
 * оглавление-якоря (на узком экране свёрнутое), подписи картинок под ними. Старая биография
 * без разделов — как есть, без оглавления.
 */
export function AuthorBiography({ lang, biography }: AuthorBiographyProps) {
  if (!biography?.trim()) return null;
  const t = createTranslator(lang);
  const { anchors } = anchorHeadings(sanitizeRichHtml(biography), BIOGRAPHY_ANCHOR_PREFIX);
  const toc = anchors.length >= BIOGRAPHY_TOC_MIN_SECTIONS ? anchors : [];
  const links = (
    <ol className={styles.tocList}>
      {toc.map((anchor) => (
        <li key={anchor.id}>
          <a href={`#${anchor.id}`}>{anchor.text}</a>
        </li>
      ))}
    </ol>
  );

  return (
    <section className={styles.section} aria-labelledby="author-biography-title">
      <h2 id="author-biography-title" className={styles.title}>
        {t('author.biography')}
      </h2>
      {toc.length > 0 && (
        <>
          <nav className={styles.tocWide} aria-label={t('common.tableOfContents')}>
            <p className={styles.tocTitle}>{t('common.tableOfContents')}</p>
            {links}
          </nav>
          <details className={styles.tocNarrow}>
            <summary className={styles.tocTitle}>{t('common.tableOfContents')}</summary>
            <nav aria-label={t('common.tableOfContents')}>{links}</nav>
          </details>
        </>
      )}
      <RichTextContent
        html={biography}
        transformSafeHtml={anchorBiographyHeadings}
        className={
          BLOCK_MARKUP.test(biography) ? styles.content : `${styles.content} ${styles.plain}`
        }
      />
    </section>
  );
}
