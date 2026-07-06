import type { FC } from 'react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree, Tag } from '@/types/api-schema';
import styles from './TaxonomyCardGrid.module.scss';

export interface TaxonomyCardGridProps {
  lang: SupportedLang;
  items: CategoryTree[] | Tag[];
  routeBase: string;
  emptyText: string;
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

const getShortDescription = (item: CategoryTree | Tag, lang: SupportedLang): string | undefined => {
  if (isTag(item)) {
    const trans = item.translations?.find((t) => t.language === lang);
    return trans?.shortDescription || trans?.description || undefined;
  }
  const trans = item.translation;
  return trans?.shortDescription || item.description || undefined;
};

export const TaxonomyCardGrid: FC<TaxonomyCardGridProps> = ({
  lang,
  items,
  routeBase,
  emptyText,
}) => {
  const filtered = items.filter((item) => {
    return item.isVisible !== false && (item.booksCount || 0) > 0;
  });

  if (filtered.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <div className={styles.grid}>
      {filtered.map((item) => {
        const name = getName(item, lang);
        const description = getShortDescription(item, lang);
        const booksCount = item.booksCount || 0;

        return (
          <Link key={item.id} href={`/${lang}/${routeBase}/${item.slug}`} className={styles.card}>
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>{name}</h3>
              {description && <p className={styles.cardDescription}>{description}</p>}
            </div>
            <div className={styles.cardFooter}>
              <span className={styles.bookCount}>
                {booksCount} {booksCount === 1 ? 'book' : 'books'}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
