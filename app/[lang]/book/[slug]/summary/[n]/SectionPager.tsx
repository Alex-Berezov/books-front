import Link from 'next/link';
import { summarySectionPath } from '@/lib/seo/summary-path';
import styles from '../summary.module.scss';

type Props = {
  lang: string;
  bookSlug: string;
  current: number;
  sections: readonly { number: number; title: string }[];
  ariaLabel: string;
};

/**
 * «← {предыдущий раздел}» / «{следующий раздел} →» (F04-3, `product.md` §5 п.7): подписи -
 * названия разделов, новых строк нет (решение арбитра `F04 | F04-3`). На первом нет предыдущего,
 * на последнем - следующего.
 */
export function SectionPager({ lang, bookSlug, current, sections, ariaLabel }: Props) {
  const at = sections.findIndex((s) => s.number === current);
  const prev = at > 0 ? sections[at - 1] : null;
  const next = at >= 0 && at < sections.length - 1 ? sections[at + 1] : null;
  if (!prev && !next) return null;
  const href = (n: number) => `/${lang}${summarySectionPath(bookSlug, n)}`;
  return (
    <nav className={styles.pager} aria-label={ariaLabel}>
      {prev && (
        <Link href={href(prev.number)} rel="prev" className={styles.pagerPrev}>
          <span aria-hidden="true">← </span>
          {prev.title}
        </Link>
      )}
      {next && (
        <Link href={href(next.number)} rel="next" className={styles.pagerNext}>
          {next.title}
          <span aria-hidden="true"> →</span>
        </Link>
      )}
    </nav>
  );
}
