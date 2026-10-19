import Link from 'next/link';
import type { VersionPreview } from '@/types/api-schema';
import { BOOK_ANCHORS } from '../bookAnchors';
import { BookContinueBlock, BookSubpageSection, type BookCtaLink } from '../BookSubpageActions';
import styles from './summary.module.scss';

/**
 * «Узнать больше о книге»: только материалы, которые у книги есть, - разделы её страницы
 * и анализ (`product.md` F03 §22). Пустые разделы ссылкой не становятся (заглушек нет);
 * `analysisHref` - `null`, когда анализа на языке страницы нет.
 */
export function buildExploreLinks(
  bookHref: string,
  version: Pick<VersionPreview, 'characters' | 'symbols' | 'quotes'>,
  analysisHref: string | null,
  labels: { about: string; analysis: string; characters: string; symbols: string; quotes: string }
): { href: string; label: string }[] {
  return [
    { href: bookHref, label: labels.about },
    ...(analysisHref ? [{ href: analysisHref, label: labels.analysis }] : []),
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
  read: BookCtaLink | null;
  listen: BookCtaLink | null;
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
        <BookSubpageSection id="summary-explore" title={exploreTitle}>
          <ul className={styles.linkList}>
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </BookSubpageSection>
      )}

      <BookContinueBlock id="summary-continue" title={continueTitle} read={read} listen={listen} />
    </>
  );
}
