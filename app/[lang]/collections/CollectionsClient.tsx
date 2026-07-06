'use client';

import { Skeleton } from 'antd';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCategoriesTree } from '@/api/hooks/useCategories';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree } from '@/types/api-schema';
import styles from './page.module.scss';

const SKELETON_GROUPS = 5;
const SKELETON_LINKS_PER_GROUP = 8;

type Props = { lang: string };

export default function CollectionsClient({ lang }: Props) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();
  const { data: tree, isLoading } = useCategoriesTree('collection');

  const getTranslated = (category: CategoryTree) => {
    const trans =
      category.translations?.find((t) => t.language === supportedLang) ||
      category.translations?.[0];
    return {
      name: trans?.name || category.name || category.id,
      slug: trans?.slug || category.slug || category.id,
    };
  };

  const isPublic = (cat: {
    indexable?: boolean;
    isVisible?: boolean;
    booksCount?: number;
  }): boolean => {
    return cat.isVisible !== false && cat.indexable !== false;
  };

  const hasBooks = (category: CategoryTree): boolean => {
    if (!isPublic(category)) return false;
    if (category.booksCount && category.booksCount > 0) return true;
    if (category.children) {
      return category.children.some(
        (child) => isPublic(child) && child.booksCount && child.booksCount > 0
      );
    }
    return false;
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumbs
          items={[
            { label: t('breadcrumb.home'), href: `/${supportedLang}` },
            { label: t('collections.title') },
          ]}
        />
        <h1 className={styles.title}>{t('collections.title')}</h1>
        <p className={styles.subtitle}>{t('collections.subtitle')}</p>

        {isLoading ? (
          <div className={styles.loading}>
            {Array.from({ length: SKELETON_GROUPS }).map((_, i) => (
              <div key={i} className={styles.skeletonGroup}>
                <Skeleton.Button active className={styles.skeletonTitle} />
                <div className={styles.skeletonLinks}>
                  {Array.from({ length: SKELETON_LINKS_PER_GROUP }).map((_, j) => (
                    <Skeleton.Button key={j} active className={styles.skeletonLink} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.categoriesList}>
            {tree
              ?.filter((parentCategory) => hasBooks(parentCategory))
              .sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
              )
              .map((parentCategory) => {
                const translated = getTranslated(parentCategory);
                const totalBooksCount =
                  (parentCategory.children?.reduce(
                    (sum, child) => sum + (isPublic(child) ? child.booksCount || 0 : 0),
                    parentCategory.booksCount || 0
                  ) ??
                    parentCategory.booksCount) ||
                  0;

                const childrenWithBooks = parentCategory.children
                  ?.filter((child) => isPublic(child) && child.booksCount && child.booksCount > 0)
                  .sort(
                    (a, b) =>
                      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
                  );

                return (
                  <div key={parentCategory.id} className={styles.categoryGroup}>
                    <div className={styles.categoryHeader}>
                      <Link
                        href={`/${supportedLang}/collection/${translated.slug}`}
                        className={styles.categoryTitle}
                      >
                        {translated.name}
                      </Link>
                      <ChevronRight size={16} className={styles.chevron} />
                      <span className={styles.totalCount}>
                        {totalBooksCount} {t('collections.booksCount')}
                      </span>
                    </div>

                    {childrenWithBooks && childrenWithBooks.length > 0 && (
                      <div className={styles.subcategories}>
                        {childrenWithBooks.map((child) => {
                          const childTranslated = getTranslated(child);
                          return (
                            <Link
                              key={child.id}
                              href={`/${supportedLang}/collection/${childTranslated.slug}`}
                              className={styles.subcategoryLink}
                            >
                              <span className={styles.subcategoryName}>{childTranslated.name}</span>
                              <span className={styles.subcategoryCount}>
                                {child.booksCount || 0}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
