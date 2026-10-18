import Link from 'next/link';
import { analysisPath } from '@/lib/seo/analysis-path';
import { summaryPath } from '@/lib/seo/summary-path';
import styles from './BookSectionNav.module.scss';

export type BookSectionKey = 'book' | 'read' | 'listen' | 'summary' | 'analysis';

export interface BookSectionNavItem {
  key: BookSectionKey;
  label: string;
  href: string;
}

interface BookSectionNavProps {
  /** Только разделы, которые у книги реально есть: пустых ссылок навигация не рисует. */
  items: BookSectionNavItem[];
  active: BookSectionKey;
  ariaLabel: string;
}

interface BookSectionNavLabels {
  book: string;
  read: string;
  listen: string;
  summary: string;
  analysis: string;
}

/**
 * Пункты навигации книги - одна сборка на все подстраницы (пересказ, разбор и анализ):
 * раздел есть у книги - пункт есть, нет - пункта нет. Новый раздел добавляется здесь, а не
 * в каждой подстранице.
 */
export function buildBookSectionNavItems(input: {
  lang: string;
  bookSlug: string;
  hasText: boolean;
  hasAudio: boolean;
  hasSummary: boolean;
  /** Анализ версии языка страницы - по тому же правилу, что сама страница (`pickAnalysisVersion`). */
  hasAnalysis: boolean;
  labels: BookSectionNavLabels;
}): BookSectionNavItem[] {
  const { lang, bookSlug, hasText, hasAudio, hasSummary, hasAnalysis, labels } = input;
  const bookHref = `/${lang}/book/${bookSlug}`;
  return [
    { key: 'book', label: labels.book, href: bookHref },
    ...(hasText ? [{ key: 'read' as const, label: labels.read, href: `${bookHref}/read` }] : []),
    ...(hasAudio
      ? [{ key: 'listen' as const, label: labels.listen, href: `${bookHref}/listen` }]
      : []),
    ...(hasSummary
      ? [
          {
            key: 'summary' as const,
            label: labels.summary,
            href: `/${lang}${summaryPath(bookSlug)}`,
          },
        ]
      : []),
    ...(hasAnalysis
      ? [
          {
            key: 'analysis' as const,
            label: labels.analysis,
            href: `/${lang}${analysisPath(bookSlug)}`,
          },
        ]
      : []),
  ];
}

/**
 * Навигация по разделам одной книги: страница книги, чтение, аудио, пересказ, анализ.
 * Серверная - ссылки видны краулеру. Список собирает страница; новый раздел - новый пункт
 * списка, а не правка компонента.
 */
export function BookSectionNav({ items, active, ariaLabel }: BookSectionNavProps) {
  if (items.length < 2) return null;
  return (
    <nav className={styles.nav} aria-label={ariaLabel}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.key}>
            {item.key === active ? (
              <span className={`${styles.item} ${styles.active}`} aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className={styles.item}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
