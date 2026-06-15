'use client';

import { Skeleton } from 'antd';
import Link from 'next/link';
import { useCategories } from '@/api/hooks/useCategories';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';

type GenresClientProps = {
  lang: string;
};

export default function GenresClient({ lang }: GenresClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();

  const { data: categoriesData, isLoading } = useCategories({ limit: 50 });
  const categories = categoriesData?.data || [];

  return (
    <div className={styles.genresPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t('genres.title')}</h1>
        <p className={styles.subtitle}>{t('genres.subtitle')}</p>

        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <Skeleton.Button key={i} active className={styles.skeletonCard} />
              ))
            : categories.map((cat) => {
                const trans =
                  cat.translations?.find((t) => t.language === supportedLang) ||
                  cat.translations?.[0];
                const name = trans?.name || cat.id;
                const catSlug = trans?.slug || cat.slug || cat.id;

                return (
                  <Link
                    key={cat.id}
                    href={`/${supportedLang}/catalog/${catSlug}`}
                    className={styles.genreCard}
                    style={{ backgroundColor: 'var(--bibliaris-green)' }}
                  >
                    <div className={styles.overlay} />
                    <div className={styles.info}>
                      <p className={styles.name}>{name}</p>
                      <p className={styles.count}>
                        {cat.booksCount || 0} {t('genres.booksCount')}
                      </p>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
}
