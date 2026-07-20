import type { FC } from 'react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree } from '@/types/api-schema';
import styles from './TaxonomyTree.module.scss';

export interface TaxonomyTreeProps {
  lang: SupportedLang;
  items: CategoryTree[];
}

const getTranslatedName = (item: CategoryTree): string => {
  return item.translation?.name || item.name || '';
};

const getTranslatedShortDescription = (item: CategoryTree): string => {
  return item.translation?.shortDescription || item.description || '';
};

const getTotalBooksCount = (item: CategoryTree): number => {
  return item.booksCount || 0;
};

const isPublic = (item: CategoryTree): boolean => {
  return item.isVisible !== false && item.indexable !== false;
};

const hasBooks = (item: CategoryTree): boolean => {
  return (item.booksCount || 0) > 0;
};

export const TaxonomyTree: FC<TaxonomyTreeProps> = ({ lang, items }) => {
  const rootItems = items.filter((item) => !item.parentId && isPublic(item) && hasBooks(item));

  if (rootItems.length === 0) {
    return <p className={styles.empty}>No categories available yet.</p>;
  }

  return (
    <div className={styles.tree}>
      {rootItems.map((item) => {
        const children = (item.children || []).filter(
          (child) => isPublic(child) && (child.booksCount || 0) > 0
        );

        return (
          <div key={item.id} className={styles.group}>
            <div className={styles.groupHeader}>
              <Link href={`/${lang}/category/${item.slug}`} className={styles.groupTitle}>
                {getTranslatedName(item)}
              </Link>
              <span className={styles.totalCount}>
                {getTotalBooksCount(item)} {getTotalBooksCount(item) === 1 ? 'book' : 'books'}
              </span>
            </div>
            {getTranslatedShortDescription(item) && (
              <p className={styles.groupDescription}>{getTranslatedShortDescription(item)}</p>
            )}
            {children.length > 0 && (
              <div className={styles.subcategories}>
                {children.map((child, childIndex) => (
                  <span key={child.id}>
                    <Link
                      href={`/${lang}/category/${child.slug}`}
                      className={styles.subcategoryLink}
                    >
                      <span className={styles.subcategoryName}>{getTranslatedName(child)}</span>
                      <span className={styles.subcategoryCount}>{child.booksCount}</span>
                    </Link>
                    {childIndex < children.length - 1 && (
                      <span className={styles.subcategorySeparator}> | </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
