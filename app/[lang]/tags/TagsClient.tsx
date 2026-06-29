'use client';

import { Skeleton } from 'antd';
import Link from 'next/link';
import { useTags } from '@/api/hooks/useTags';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Tag } from '@/types/api-schema';
import styles from './page.module.scss';

type TagsClientProps = {
  lang: string;
};

export default function TagsClient({ lang }: TagsClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();

  const { data: tagsData, isLoading } = useTags({ limit: 100 });
  const tags = tagsData?.data || [];

  // Filter tags that have books
  const tagsWithBooks = tags.filter((tag) => (tag.booksCount || 0) > 0);

  // Get translated name and slug for a tag
  const getTranslated = (tag: Tag) => {
    const trans =
      tag.translations?.find((t) => t.language === supportedLang) || tag.translations?.[0];
    return {
      name: trans?.name || tag.name || tag.id,
      slug: trans?.slug || tag.slug || tag.id,
    };
  };

  // JSON-LD for CollectionPage and BreadcrumbList
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
            item: `https://bibliaris.com/${supportedLang}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('tags.allTags'),
            item: `https://bibliaris.com/${supportedLang}/tags`,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: t('tags.title'),
        description: t('tags.subtitle'),
        url: `https://bibliaris.com/${supportedLang}/tags`,
        numberOfItems: tagsWithBooks.length,
      },
    ],
  };

  return (
    <div className={styles.tagsPage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.container}>
        <h1 className={styles.title}>{t('tags.title')}</h1>
        <p className={styles.subtitle}>{t('tags.subtitle')}</p>

        {isLoading ? (
          <div className={styles.loading}>
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton.Button key={i} active className={styles.skeletonTag} />
            ))}
          </div>
        ) : tagsWithBooks.length === 0 ? (
          <div className={styles.empty}>
            <p>{t('tags.noTags')}</p>
          </div>
        ) : (
          <div className={styles.tagsGrid}>
            {tagsWithBooks.map((tag) => {
              const translated = getTranslated(tag);
              return (
                <Link
                  key={tag.id}
                  href={`/${supportedLang}/tag/${translated.slug}`}
                  className={styles.tagCard}
                >
                  <span className={styles.tagName}>{translated.name}</span>
                  <span className={styles.tagCount}>
                    {tag.booksCount || 0} {t('tags.booksCount')}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
