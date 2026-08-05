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

const getName = (item: CategoryTree | TagListItem, lang: SupportedLang): string => {
  if ('translations' in item) {
    const trans = (item.translations ?? []).find(
      (t: { language: string; name: string; slug: string }) => t.language === lang
    );
    return trans?.name || item.name || '';
  }
  return item.name || '';
};

const getChildName = (child: CategoryTree): string => {
  return child.translation?.name || child.name || '';
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

  const filtered = items.filter((item) => isTaxonomyLinkable(item));

  if (filtered.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <div className={styles.grid}>
      {filtered.map((item) => {
        const name = getName(item, lang);
        const booksCount = getTotalBooks(item);

        let children: CategoryTree[] = [];
        if (!isTagKind) {
          const cat = item as CategoryTree;
          children = (cat.children || []).filter((child) => isTaxonomyLinkable(child));
        }

        return (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <Link href={`/${lang}/${routeBase}/${item.slug}`} className={styles.cardTitle}>
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
                    {getChildName(child)}
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
