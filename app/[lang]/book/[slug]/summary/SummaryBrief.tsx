import { Clock } from 'lucide-react';
import { RichTextContent } from '@/components/common/RichTextContent';
import { SUMMARY_BRIEF_ANCHOR } from '@/lib/seo/summary-path';
import { demoteH1 } from '@/lib/utils/heading-anchors';
import { readingMinutes } from '@/lib/utils/reading-time';
import styles from './summary.module.scss';

type Props = {
  html: string;
  plainText: string;
  title: string;
  fullTitle: string;
  /** Подпись времени чтения с `{minutes}` - та же строка, что в шапке. */
  readingTimeTemplate: string;
};

/**
 * Блок «Очень кратко» вверху страницы пересказа и заголовок «Полный пересказ» под ним (F04-2,
 * `product.md` §4 п.3, п.5). Время чтения - своё, по очень краткому. Заголовки текста без якорей:
 * разделы очень краткого - не разделы оглавления сайдбара.
 */
export function SummaryBrief({ html, plainText, title, fullTitle, readingTimeTemplate }: Props) {
  const titleId = `${SUMMARY_BRIEF_ANCHOR}-title`;
  return (
    <>
      <section id={SUMMARY_BRIEF_ANCHOR} className={styles.brief} aria-labelledby={titleId}>
        <div className={styles.briefHead}>
          <h2 id={titleId} className={styles.blockTitle}>
            {title}
          </h2>
          <span className={styles.briefReading}>
            <Clock size={14} aria-hidden="true" />
            {readingTimeTemplate.replace('{minutes}', String(readingMinutes(plainText)))}
          </span>
        </div>
        <RichTextContent html={html} transformSafeHtml={demoteH1} className={styles.text} />
      </section>
      <h2 className={styles.blockTitle}>{fullTitle}</h2>
    </>
  );
}
