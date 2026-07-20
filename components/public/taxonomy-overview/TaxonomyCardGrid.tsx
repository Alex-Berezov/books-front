import type { FC } from 'react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree, Tag } from '@/types/api-schema';
import styles from './TaxonomyCardGrid.module.scss';

const DESKTOP_SKELETONS = 8;
const MOBILE_SKELETONS = 3;

export interface TaxonomyCardGridProps {
  lang: SupportedLang;
  items: CategoryTree[] | Tag[];
  routeBase: string;
  emptyText: string;
  isLoading?: boolean;
}

const isTag = (item: CategoryTree | Tag): item is Tag => {
  return 'key' in item && !('parentId' in item);
};

const getName = (item: CategoryTree | Tag, lang: SupportedLang): string => {
  if (isTag(item)) {
    const trans = item.translations?.find((t) => t.language === lang);
    return trans?.name || item.name || '';
  }
  const trans = item.translation;
  return trans?.name || item.name || '';
};

const getChildName = (child: CategoryTree): string => {
  return child.translation?.name || child.name || '';
};

const isPublicItem = (item: CategoryTree): boolean => {
  return item.isVisible !== false && item.indexable !== false;
};

const getTotalBooks = (item: CategoryTree): number => {
  return item.booksCount || 0;
};

const hasAnyBooks = (item: CategoryTree): boolean => {
  return (item.booksCount || 0) > 0;
};

export const TaxonomyCardGrid: FC<TaxonomyCardGridProps> = ({
  lang,
  items,
  routeBase,
  emptyText,
  isLoading,
}) => {
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

  const filtered = items.filter((item) => {
    if (isTag(item)) {
      return item.isVisible !== false && (item.booksCount || 0) > 0;
    }
    return isPublicItem(item) && hasAnyBooks(item);
  });

  if (filtered.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <div className={styles.grid}>
      {filtered.map((item) => {
        const name = getName(item, lang);
        const booksCount = isTag(item) ? item.booksCount || 0 : getTotalBooks(item);

        let children: CategoryTree[] = [];
        if (!isTag(item)) {
          children = (item.children || []).filter(
            (child) => isPublicItem(child) && (child.booksCount || 0) > 0
          );
        }

        return (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <Link href={`/${lang}/${routeBase}/${item.slug}`} className={styles.cardTitle}>
                {name}
              </Link>
              <span className={styles.bookCount}>
                {booksCount} {booksCount === 1 ? 'book' : 'books'}
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
