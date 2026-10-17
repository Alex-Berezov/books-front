import { BookOpen, Headphones } from 'lucide-react';
import Link from 'next/link';
import type { VersionPreview } from '@/types/api-schema';
import { BOOK_ANCHORS } from '../bookAnchors';
import styles from './summary.module.scss';

/**
 * «Узнать больше о книге»: только материалы, которые у книги есть, - разделы её страницы.
 * Пустые разделы ссылкой не становятся (заглушек нет).
 */
export function buildExploreLinks(
  bookHref: string,
  version: Pick<VersionPreview, 'characters' | 'symbols' | 'quotes'>,
  labels: { about: string; characters: string; symbols: string; quotes: string }
): { href: string; label: string }[] {
  return [
    { href: bookHref, label: labels.about },
    ...(version.characters?.length
      ? [{ href: `${bookHref}#${BOOK_ANCHORS.characters}`, label: labels.characters }]
      : []),
    ...(version.symbols?.length
      ? [{ href: `${bookHref}#${BOOK_ANCHORS.symbols}`, label: labels.symbols }]
      : []),
    ...(version.quotes?.length
      ? [{ href: `${bookHref}#${BOOK_ANCHORS.quotes}`, label: labels.quotes }]
      : []),
  ];
}

interface SummaryMoreBlocksProps {
  exploreTitle: string;
  /** Только материалы, которые у книги есть: пустых ссылок и заглушек блок не рисует. */
  exploreLinks: { href: string; label: string }[];
  continueTitle: string;
  read: { href: string; label: string } | null;
  listen: { href: string; label: string } | null;
}

/** Блоки сразу после пересказа: «узнать больше о книге» и переход к чтению или аудио. */
export function SummaryMoreBlocks({
  exploreTitle,
  exploreLinks,
  continueTitle,
  read,
  listen,
}: SummaryMoreBlocksProps) {
  return (
    <>
      {exploreLinks.length > 0 && (
        <section className={styles.block} aria-labelledby="summary-explore">
          <h2 id="summary-explore" className={styles.blockTitle}>
            {exploreTitle}
          </h2>
          <ul className={styles.linkList}>
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(read || listen) && (
        <section className={styles.block} aria-labelledby="summary-continue">
          <h2 id="summary-continue" className={styles.blockTitle}>
            {continueTitle}
          </h2>
          <div className={styles.actions}>
            {read && (
              <Link href={read.href} className={styles.ctaPrimary}>
                <BookOpen size={18} aria-hidden="true" />
                {read.label}
              </Link>
            )}
            {listen && (
              <Link href={listen.href} className={styles.ctaSecondary}>
                <Headphones size={18} aria-hidden="true" />
                {listen.label}
              </Link>
            )}
          </div>
        </section>
      )}
    </>
  );
}
