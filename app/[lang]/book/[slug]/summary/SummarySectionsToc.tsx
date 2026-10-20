import Link from 'next/link';
import { summarySectionPath } from '@/lib/seo/summary-path';
import styles from './summary.module.scss';

type Props = {
  lang: string;
  bookSlug: string;
  title: string;
  sections: readonly { number: number; title: string }[];
  /** Номер открытого раздела: его пункт отмечен и не ссылка (`product.md` §5 п.8). */
  current?: number;
  className?: string;
  /** Класс заголовка: в сайдбаре - как у соседних карточек. */
  titleClassName?: string;
};

/**
 * Оглавление «Краткое содержание по главам» (F04-3): на `/summary` над полным пересказом
 * (`product.md` §4 п.4), на странице раздела - в сайдбаре (§5 п.8). Номер и название раздела;
 * пустой список - блока нет.
 */
export function SummarySectionsToc({
  lang,
  bookSlug,
  title,
  sections,
  current,
  className,
  titleClassName,
}: Props) {
  if (sections.length === 0) return null;
  const titleId = 'summary-sections-title';
  return (
    <nav className={className ?? styles.sections} aria-labelledby={titleId}>
      <h2 id={titleId} className={titleClassName ?? styles.blockTitle}>
        {title}
      </h2>
      <ol className={styles.sectionList}>
        {sections.map((section) => (
          <li key={section.number} value={section.number}>
            {section.number === current ? (
              <span aria-current="page">{section.title}</span>
            ) : (
              <Link
                href={`/${lang}${summarySectionPath(bookSlug, section.number)}`}
                prefetch={false}
              >
                {section.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
