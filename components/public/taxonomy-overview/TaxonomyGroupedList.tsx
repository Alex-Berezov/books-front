import type { FC } from 'react';
import Link from 'next/link';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree } from '@/types/api-schema';
import styles from './TaxonomyGroupedList.module.scss';

export interface TaxonomyGroupedListProps {
  lang: SupportedLang;
  items: CategoryTree[];
}

const getTranslatedName = (item: CategoryTree): string => {
  return item.translation?.name || item.name || '';
};

export const TaxonomyGroupedList: FC<TaxonomyGroupedListProps> = ({ lang, items }) => {
  const rootItems = items.filter((item) => !item.parentId && isTaxonomyLinkable(item));

  if (rootItems.length === 0) {
    return <p className={styles.empty}>No genres available yet.</p>;
  }

  return (
    <div className={styles.list}>
      {rootItems.map((item) => {
        const children = (item.children || []).filter((child) => isTaxonomyLinkable(child));

        const totalBooks = item.booksCount || 0;

        return (
          <div key={item.id} className={styles.group}>
            <div className={styles.groupHeader}>
              <Link href={`/${lang}/genre/${item.slug}`} className={styles.groupTitle}>
                {getTranslatedName(item)}
              </Link>
              <span className={styles.totalCount}>
                {totalBooks} {totalBooks === 1 ? 'book' : 'books'}
              </span>
            </div>
            {children.length > 0 && (
              <div className={styles.children}>
                {children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/${lang}/genre/${child.slug}`}
                    className={styles.childLink}
                  >
                    {getTranslatedName(child)}
                  </Link>
                ))}
              </div>
            )}
            {children.length === 0 && <p className={styles.noChildren}>No sub-genres listed</p>}
          </div>
        );
      })}
    </div>
  );
};
