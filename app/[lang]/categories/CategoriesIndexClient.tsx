'use client';

import { Skeleton } from 'antd';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCategoriesTree } from '@/api/hooks/useCategories';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree } from '@/types/api-schema';
import styles from './page.module.scss';

// Skeleton configuration constants
const SKELETON_GROUPS = 5;
const SKELETON_LINKS_PER_GROUP = 8;

type CategoriesIndexClientProps = {
  lang: string;
};

export default function CategoriesIndexClient({ lang }: CategoriesIndexClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();

  const { data: categoriesTree, isLoading } = useCategoriesTree('category');

  const getTranslated = (category: CategoryTree) => {
    const trans =
      category.translations?.find((t) => t.language === supportedLang) ||
      category.translations?.[0];
    return {
      name: trans?.name || category.name || category.id,
      slug: trans?.slug || category.slug || category.id,
    };
  };

  const getTotalBooksCount = (category: CategoryTree): number => {
    if (category.children && category.children.length > 0) {
      return category.children.reduce((sum, child) => sum + (child.booksCount || 0), 0);
    }
    return category.booksCount || 0;
  };

  const hasBooks = (category: CategoryTree): boolean => {
    if (category.booksCount && category.booksCount > 0) return true;
    if (category.children && category.children.length > 0) {
      return category.children.some((child) => child.booksCount && child.booksCount > 0);
    }
    return false;
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('book.home'),
            item: `/${supportedLang}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('categories.title'),
            item: `/${supportedLang}/categories`,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: t('categories.title'),
        description: t('categories.subtitle'),
        url: `/${supportedLang}/categories`,
      },
    ],
  };

  return (
    <div className={styles.categoriesPage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.container}>
        <h1 className={styles.title}>{t('categories.title')}</h1>
        <p className={styles.subtitle}>{t('categories.subtitle')}</p>

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

                const childrenWithBooks = parentCategory.children?.filter(
                  (child) => child.booksCount && child.booksCount > 0
                );

                return (
                  <div key={parentCategory.id} className={styles.categoryGroup}>
                    <div className={styles.categoryHeader}>
                      <Link
                        href={`/${supportedLang}/category/${parentTranslated.slug}`}
                        className={styles.categoryTitle}
                      >
                        {parentTranslated.name}
                      </Link>
                      <ChevronRight size={16} className={styles.chevron} />
                      <span className={styles.totalCount}>
                        {totalBooksCount} {t('categories.booksCount')}
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
                              href={`/${supportedLang}/category/${childTranslated.slug}`}
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
