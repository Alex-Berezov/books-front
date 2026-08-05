import type { FC } from 'react';
import Link from 'next/link';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';
import type { TagListItem } from '@/api/endpoints/public';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree } from '@/types/api-schema';
import styles from './TaxonomyCardGrid.module.scss';

const DESKTOP_SKELETONS = 8;
const MOBILE_SKELETONS = 3;

export type TaxonomyCardItemKind = 'category' | 'tag';

export interface TaxonomyCardGridProps {
  lang: SupportedLang;
  items: CategoryTree[] | TagListItem[];
  routeBase: string;
  emptyText: string;
  isLoading?: boolean;
  itemKind: TaxonomyCardItemKind;
  bookSingular: string;
  bookPlural: string;
}

const findTranslation = (item: CategoryTree | TagListItem, lang: SupportedLang) =>
  (item.translations ?? []).find((t) => t.language === lang);

const getName = (item: CategoryTree | TagListItem, lang: SupportedLang): string => {
  return findTranslation(item, lang)?.name || item.name || '';
};

/**
 * The slug this term has in the language being rendered — or `null`.
 *
 * Deliberately no fallback to `item.slug`: that is the base (English) slug, and
 * linking to it from a localized page mints a second URL for a page that already
 * exists under its own slug, e.g. `/ru/genre/historical-fiction` next to
 * `/ru/genre/istoricheskaya-proza`.
 */
const getSlug = (item: CategoryTree | TagListItem, lang: SupportedLang): string | null => {
  return findTranslation(item, lang)?.slug || null;
};

const getTotalBooks = (item: CategoryTree | TagListItem): number => {
  return item.booksCount || 0;
};

export const TaxonomyCardGrid: FC<TaxonomyCardGridProps> = ({
  lang,
  items,
  routeBase,
  emptyText,
  isLoading,
  itemKind,
  bookSingular,
  bookPlural,
}) => {
  const isTagKind = itemKind === 'tag';

  if (isLoading) {
    return (
      <div className={styles.loading}>
        {Array.from({ length: DESKTOP_SKELETONS }, (_, i) => (
          <div
            key={i}
            className={`${styles.skeletonCard} ${i >= MOBILE_SKELETONS ? styles.skeletonHideMobile : ''}`}
          >
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonCount} />
            <div className={styles.skeletonChildren}>
              <div className={styles.skeletonChild} />
              <div className={styles.skeletonChild} />
              <div className={styles.skeletonChild} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // A term without a slug in this language is dropped here rather than skipped
  // during render, so that "nothing to show" still reaches `emptyText` instead
  // of leaving an empty grid behind.
  const filtered = items.filter((item) => isTaxonomyLinkable(item) && getSlug(item, lang));

  if (filtered.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <div className={styles.grid}>
      {filtered.map((item) => {
        const slug = getSlug(item, lang);
        if (!slug) return null; // Already excluded above; keeps the type honest.

        const name = getName(item, lang);
        const booksCount = getTotalBooks(item);

        let children: Array<{ id: string; slug: string; name: string }> = [];
        if (!isTagKind) {
          const cat = item as CategoryTree;
          children = (cat.children || [])
            .filter((child) => isTaxonomyLinkable(child))
            .map((child) => {
              const childSlug = getSlug(child, lang);
              return childSlug
                ? { id: child.id, slug: childSlug, name: getName(child, lang) }
                : null;
            })
            .filter((child): child is { id: string; slug: string; name: string } => child !== null);
        }

        return (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <Link href={`/${lang}/${routeBase}/${slug}`} className={styles.cardTitle}>
                {name}
              </Link>
              <span className={styles.bookCount}>
                {booksCount} {booksCount === 1 ? bookSingular : bookPlural}
              </span>
            </div>
            {children.length > 0 && (
              <div className={styles.children}>
                {children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/${lang}/${routeBase}/${child.slug}`}
                    className={styles.childLink}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
