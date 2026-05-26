'use client';

import { Skeleton } from 'antd';
import Link from 'next/link';
import { useCategories } from '@/api/hooks/useCategories';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';

type Props = {
  params: { lang: string };
};

export default function GenresPage({ params }: Props) {
  const { lang } = params;
  const supportedLang = lang as SupportedLang;

  const { data: categoriesData, isLoading } = useCategories({ limit: 50 });
  const categories = categoriesData?.data || [];

  return (
    <main className={styles.genresPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>Browse Genres</h1>
        <p className={styles.subtitle}>Discover books across every genre and style</p>

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

                return (
                  <Link
                    key={cat.id}
                    href={`/${supportedLang}/catalog/${cat.id}`}
                    className={styles.genreCard}
                    style={{ backgroundColor: 'var(--bibliaris-green)' }}
                  >
                    <div className={styles.overlay} />
                    <div className={styles.info}>
                      <p className={styles.name}>{name}</p>
                      <p className={styles.count}>{cat.booksCount || 0} books</p>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </main>
  );
}
