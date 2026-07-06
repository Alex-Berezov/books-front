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

// Skeleton configuration constants
const SKELETON_GROUPS = 5;
const SKELETON_LINKS_PER_GROUP = 8;

type GenresClientProps = {
  lang: string;
};

export default function GenresClient({ lang }: GenresClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();

  const { data: categoriesTree, isLoading } = useCategoriesTree('genre');

  // Helper to get translated name and slug
  const getTranslated = (category: CategoryTree) => {
    const trans =
      category.translations?.find((t) => t.language === supportedLang) ||
      category.translations?.[0];
    return {
      name: trans?.name || category.name || category.id,
      slug: trans?.slug || category.slug || category.id,
    };
  };

  // Calculate total books count for a category (sum of children only for parents)
  const getTotalBooksCount = (category: CategoryTree): number => {
    // For parent categories, sum only children counts
    if (category.children && category.children.length > 0) {
      return category.children.reduce((sum, child) => sum + (child.booksCount || 0), 0);
    }
    // For leaf categories, return own count
    return category.booksCount || 0;
  };

  // Check if category has any books (directly or in children)
  const hasBooks = (category: CategoryTree): boolean => {
    if (category.booksCount && category.booksCount > 0) return true;
    if (category.children && category.children.length > 0) {
      return category.children.some((child) => child.booksCount && child.booksCount > 0);
    }
    return false;
  };

  return (
    <div className={styles.genresPage}>
      <div className={styles.container}>
        <Breadcrumbs
          items={[
            { label: t('breadcrumb.home'), href: `/${supportedLang}` },
            { label: t('genres.title') },
          ]}
        />
        <h1 className={styles.title}>{t('genres.title')}</h1>
        <p className={styles.subtitle}>{t('genres.subtitle')}</p>

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
            {categoriesTree
              ?.filter((parentCategory) => hasBooks(parentCategory))
              .map((parentCategory) => {
                const parentTranslated = getTranslated(parentCategory);
                const totalBooksCount = getTotalBooksCount(parentCategory);

                // Filter children that have books
                const childrenWithBooks = parentCategory.children?.filter(
                  (child) => child.booksCount && child.booksCount > 0
                );

                return (
                  <div key={parentCategory.id} className={styles.categoryGroup}>
                    <div className={styles.categoryHeader}>
                      <Link
                        href={`/${supportedLang}/genre/${parentTranslated.slug}`}
                        className={styles.categoryTitle}
                      >
                        {parentTranslated.name}
                      </Link>
                      <ChevronRight size={16} className={styles.chevron} />
                      <span className={styles.totalCount}>
                        {totalBooksCount} {t('genres.booksCount')}
                      </span>
                    </div>

                    {childrenWithBooks && childrenWithBooks.length > 0 && (
                      <div className={styles.subcategories}>
                        {childrenWithBooks.map((child) => {
                          const childTranslated = getTranslated(child);
                          const childBooksCount = child.booksCount || 0;

                          return (
                            <Link
                              key={child.id}
                              href={`/${supportedLang}/genre/${childTranslated.slug}`}
                              className={styles.subcategoryLink}
                            >
                              <span className={styles.subcategoryName}>{childTranslated.name}</span>
                              <span className={styles.subcategoryCount}>{childBooksCount}</span>
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
