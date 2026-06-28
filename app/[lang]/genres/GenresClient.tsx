'use client';

import { Skeleton } from 'antd';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCategoriesTree } from '@/api/hooks/useCategories';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree } from '@/types/api-schema';
import styles from './page.module.scss';

type GenresClientProps = {
  lang: string;
};

export default function GenresClient({ lang }: GenresClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();

  const { data: categoriesTree, isLoading } = useCategoriesTree();

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

  // Calculate total books count for a category (including children)
  const getTotalBooksCount = (category: CategoryTree): number => {
    const ownCount = category.booksCount || 0;
    const childrenCount = category.children?.reduce(
      (sum, child) => sum + getTotalBooksCount(child),
      0
    );
    return ownCount + childrenCount;
  };

  return (
    <div className={styles.genresPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t('genres.title')}</h1>
        <p className={styles.subtitle}>{t('genres.subtitle')}</p>

        {isLoading ? (
          <div className={styles.loading}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonGroup}>
                <Skeleton.Button active className={styles.skeletonTitle} />
                <div className={styles.skeletonLinks}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton.Button key={j} active className={styles.skeletonLink} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.categoriesList}>
            {categoriesTree?.map((parentCategory) => {
              const parentTranslated = getTranslated(parentCategory);
              const totalBooksCount = getTotalBooksCount(parentCategory);

              return (
                <div key={parentCategory.id} className={styles.categoryGroup}>
                  <div className={styles.categoryHeader}>
                    <Link
                      href={`/${supportedLang}/catalog/${parentTranslated.slug}`}
                      className={styles.categoryTitle}
                    >
                      {parentTranslated.name}
                    </Link>
                    <ChevronRight size={16} className={styles.chevron} />
                    <span className={styles.totalCount}>
                      {totalBooksCount} {t('genres.booksCount')}
                    </span>
                  </div>

                  {parentCategory.children && parentCategory.children.length > 0 && (
                    <div className={styles.subcategories}>
                      {parentCategory.children.map((child) => {
                        const childTranslated = getTranslated(child);
                        const childBooksCount = child.booksCount || 0;

                        return (
                          <Link
                            key={child.id}
                            href={`/${supportedLang}/catalog/${childTranslated.slug}`}
                            className={styles.subcategoryLink}
                          >
                            <span className={styles.subcategoryName}>{childTranslated.name}</span>
                            {childBooksCount > 0 && (
                              <span className={styles.subcategoryCount}>{childBooksCount}</span>
                            )}
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
