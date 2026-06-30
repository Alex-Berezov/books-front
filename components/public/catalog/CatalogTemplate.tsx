'use client';

import { Badge, Skeleton } from 'antd';
import { ListFilter as Filter, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBooks } from '@/api/hooks/useBooks';
import { useCategories } from '@/api/hooks/useCategories';
import { useCategoryBooks } from '@/api/hooks/usePublic';
import { Button } from '@/components/common/Button';
import { BookCard } from '@/components/public/books/BookCard';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './CatalogTemplate.module.scss';

// Types for book processing
interface TagDetails {
  id: string;
  translations?: Array<{ language: string; name: string }>;
}
interface VersionWithTags {
  tags?: Array<{ tag?: TagDetails }>;
}

interface CatalogTemplateProps {
  lang: SupportedLang;
  categorySlug?: string;
}

export function CatalogTemplate({ lang, categorySlug }: CatalogTemplateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { data: categoriesData } = useCategories({ type: 'category', limit: 50 });
  const { data: genresData } = useCategories({ type: 'genre', limit: 50 });
  const categories = (categoriesData?.data || []).filter((cat) => (cat.booksCount || 0) > 0);
  const genres = (genresData?.data || []).filter((gen) => (gen.booksCount || 0) > 0);

  const search = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const sort = searchParams.get('sort') || '';

  // 1. Fetch books based on whether categorySlug is present
  const { data: categoryBooksData, isLoading: loadingCatBooks } = useCategoryBooks(
    lang,
    categorySlug || '',
    1,
    100,
    { enabled: !!categorySlug }
  );

  const { data: allBooksData, isLoading: loadingAllBooks } = useBooks(
    { limit: 100 },
    { enabled: !categorySlug }
  );

  const loading = categorySlug ? loadingCatBooks : loadingAllBooks;
  const currentCategory = categorySlug ? categoryBooksData?.category : null;
  const rawBooks = (
    (categorySlug ? categoryBooksData?.data || [] : allBooksData?.data || []) as BookOverview[]
  )
    .filter((book) =>
      book.versions?.some((version) => version.language === lang && version.status === 'published')
    )
    .map((book) => {
      const currentLangVersion = book.versions?.find(
        (version) => version.language === lang && version.status === 'published'
      );
      const displayVersion =
        currentLangVersion ||
        book.versions?.find((version) => version.status === 'published') ||
        book.versions?.[0];

      const tagsMap = new Map();
      (book.versions as VersionWithTags[] | undefined)?.forEach((version) => {
        version.tags?.forEach((tagItem) => {
          const tagObj = tagItem.tag;
          if (tagObj && tagObj.id) {
            tagsMap.set(tagObj.id, tagObj);
          }
        });
      });

      return {
        ...book,
        title: displayVersion?.title || book.title || '',
        author: displayVersion?.author || book.author || '',
        tags: Array.from(tagsMap.values()),
      };
    });

  // 2. Client-side filtering & sorting (type, sort, search)
  let filteredBooks = [...rawBooks];

  if (search) {
    const searchLower = search.toLowerCase();
    filteredBooks = filteredBooks.filter(
      (book: BookOverview) =>
        (book.title || '').toLowerCase().includes(searchLower) ||
        (book.author || '').toLowerCase().includes(searchLower) ||
        book.tags?.some(
          (tag) =>
            (tag.id || '').toLowerCase().includes(searchLower) ||
            tag.translations?.some((translation) =>
              (translation.name || '').toLowerCase().includes(searchLower)
            )
        )
    );
  }

  if (type === 'audio') {
    filteredBooks = filteredBooks.filter((book: BookOverview) => book.hasAudio === true);
  }

  if (sort === 'new') {
    filteredBooks.sort(
      (bookA: BookOverview, bookB: BookOverview) =>
        new Date(bookB.createdAt).getTime() - new Date(bookA.createdAt).getTime()
    );
  } else if (sort === 'popular') {
    filteredBooks.sort(
      (bookA: BookOverview, bookB: BookOverview) => (bookB.rating || 0) - (bookA.rating || 0)
    );
  }

  // Clear filters helper
  const handleClearFilters = () => {
    router.push(`/${lang}/catalog`);
  };

  // Determine page title
  // For categories, find language translation (check singular translation or search translations array)
  const catTranslation =
    currentCategory?.translation || currentCategory?.translations?.find((t) => t.language === lang);
  const categoryName = catTranslation?.name || currentCategory?.name || currentCategory?.id || '';

  const pageTitle = categorySlug
    ? categoryName
    : type === 'audio'
      ? t('header.audiobooks')
      : sort === 'new'
        ? t('header.newReleases')
        : sort === 'popular'
          ? t('catalog.popular')
          : search
            ? search
            : t('catalog.allBooks');

  return (
    <div className={styles.catalogPage}>
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Sidebar Filters */}
          <aside className={styles.sidebar}>
            <div className={styles.stickySidebar}>
              <h3 className={styles.sidebarTitle}>
                <SlidersHorizontal size={16} /> {t('catalog.sidebarTitle')}
              </h3>
              <div className={styles.genresList}>
                <Link
                  href={`/${lang}/catalog`}
                  className={`${styles.genreLink} ${
                    !categorySlug && !type && !sort ? styles.activeGenre : ''
                  }`}
                >
                  {t('catalog.allBooks')}
                </Link>

                {categories.length > 0 && (
                  <>
                    <h4 className={styles.sidebarSubtitle}>{t('categories.title')}</h4>
                    {categories.map((cat) => {
                      const trans =
                        cat.translations?.find((t) => t.language === lang) || cat.translations?.[0];
                      const name = trans?.name || cat.id;
                      const catSlug = trans?.slug || cat.slug || cat.id;
                      const isActive =
                        categorySlug === trans?.slug ||
                        categorySlug === cat.slug ||
                        categorySlug === cat.id;

                      return (
                        <Link
                          key={cat.id}
                          href={`/${lang}/category/${catSlug}`}
                          className={`${styles.genreLink} ${isActive ? styles.activeGenre : ''}`}
                        >
                          {name}
                        </Link>
                      );
                    })}
                  </>
                )}

                {genres.length > 0 && (
                  <>
                    <h4 className={styles.sidebarSubtitle}>{t('genres.title')}</h4>
                    {genres.map((gen) => {
                      const trans =
                        gen.translations?.find((t) => t.language === lang) || gen.translations?.[0];
                      const name = trans?.name || gen.id;
                      const genSlug = trans?.slug || gen.slug || gen.id;
                      const isActive =
                        categorySlug === trans?.slug ||
                        categorySlug === gen.slug ||
                        categorySlug === gen.id;

                      return (
                        <Link
                          key={gen.id}
                          href={`/${lang}/genre/${genSlug}`}
                          className={`${styles.genreLink} ${isActive ? styles.activeGenre : ''}`}
                        >
                          {name}
                        </Link>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className={styles.content}>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.title}>{pageTitle}</h1>
                {categorySlug && currentCategory?.description && (
                  <div
                    className={styles.categoryDescription}
                    dangerouslySetInnerHTML={{ __html: currentCategory.description }}
                  />
                )}
                {!loading && (
                  <p className={styles.count}>
                    {filteredBooks.length} {t('catalog.booksFound')}
                  </p>
                )}
              </div>
              <div className={styles.badges}>
                {type === 'audio' && (
                  <Badge status="processing" text={t('catalog.audiobooksOnly')} />
                )}
                {sort === 'new' && <Badge status="warning" text={t('catalog.newReleases')} />}
                {sort === 'popular' && <Badge status="success" text={t('catalog.popular')} />}
              </div>
            </div>

            {loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={styles.skeletonCard}>
                    <Skeleton.Button active className={styles.skeletonCover} />
                    <Skeleton active paragraph={{ rows: 2 }} title={false} />
                  </div>
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className={styles.empty}>
                <Filter className={styles.emptyIcon} size={48} />
                <p className={styles.emptyText}>{t('catalog.noBooksFound')}</p>
                <Button variant="primary" onClick={handleClearFilters} className={styles.clearBtn}>
                  {t('catalog.clearFilters')}
                </Button>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredBooks.map((book) => (
                  <BookCard key={book.id} book={book} size="md" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
