'use client';

import { BookOpen, ChevronRight, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePublicBooks } from '@/api/hooks';
import { useCategories } from '@/api/hooks/useCategories';
import { usePage } from '@/api/hooks/usePublic';
import { useTags } from '@/api/hooks/useTags';
import { Button } from '@/components/common/Button';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
import { BookSection } from '@/components/public/books/BookSection';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, Category, PageResponse, Tag } from '@/types/api-schema';
import styles from '../page.module.scss';

type HomeClientProps = {
  lang: string;
  initialBooks?: BookOverview[];
  initialCategories?: Category[];
  initialGenres?: Category[];
  initialCollections?: Category[];
  initialTags?: Tag[];
  initialPage?: PageResponse | null;
  audiobooksCount?: number;
};

export default function HomeClient({
  lang,
  initialBooks,
  initialCategories,
  initialGenres,
  initialCollections,
  initialTags,
  initialPage,
  audiobooksCount = 0,
}: HomeClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();

  const { data: booksData } = usePublicBooks(
    supportedLang,
    { limit: 100 },
    {
      initialData: initialBooks
        ? {
            data: initialBooks,
            meta: { total: initialBooks.length, page: 1, limit: 100, totalPages: 1 },
          }
        : undefined,
    }
  );

  const { data: categoriesData } = useCategories(
    { limit: 50 },
    {
      initialData: initialCategories
        ? {
            data: initialCategories,
            meta: { total: initialCategories.length, page: 1, limit: 50, totalPages: 1 },
          }
        : undefined,
    }
  );

  const { data: genresData } = useCategories(
    { type: 'genre', limit: 50 },
    {
      initialData: initialGenres
        ? {
            data: initialGenres,
            meta: { total: initialGenres.length, page: 1, limit: 50, totalPages: 1 },
          }
        : undefined,
    }
  );

  const { data: collectionsData } = useCategories(
    { type: 'collection', limit: 50 },
    {
      initialData: initialCollections
        ? {
            data: initialCollections,
            meta: { total: initialCollections.length, page: 1, limit: 50, totalPages: 1 },
          }
        : undefined,
    }
  );

  const { data: tagsData } = useTags(
    { limit: 50 },
    {
      initialData: initialTags
        ? {
            data: initialTags,
            meta: { total: initialTags.length, page: 1, limit: 50, totalPages: 1 },
          }
        : undefined,
    }
  );

  const { data: pageData } = usePage(supportedLang, 'homepage-index', {
    initialData: initialPage || undefined,
  });

  const sections = (pageData?.sections as Record<string, unknown>) || {};
  const allBooks = (booksData?.data || []).filter((book) =>
    book.versions?.some(
      (version) => version.language === supportedLang && version.status === 'published'
    )
  );
  const categories = (categoriesData?.data || []).filter((cat) => (cat.booksCount || 0) > 0);
  const genres = (genresData?.data || []).filter((g) => (g.booksCount || 0) > 0);
  const collections = (collectionsData?.data || []).filter((c) => (c.booksCount || 0) > 0);
  const tags = tagsData?.data || [];

  const featuredBooks = [...allBooks]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

  const newReleases = [...allBooks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const audiobooks = allBooks.filter((book) => book.hasAudio === true).slice(0, 10);

  const classicBooks = allBooks
    .filter((book) =>
      book.categories?.some(
        (category) =>
          ['classics', 'classic-literature', 'classic'].includes(category.id) ||
          category.translations?.some((translation) =>
            translation.name.toLowerCase().includes('classic')
          )
      )
    )
    .slice(0, 8);

  const fantasyBooks = allBooks
    .filter((book) =>
      book.categories?.some(
        (category) =>
          ['fantasy', 'sci-fi-fantasy'].includes(category.id) ||
          category.translations?.some((translation) =>
            translation.name.toLowerCase().includes('fantasy')
          )
      )
    )
    .slice(0, 8);

  // Sections config from page
  const whyBibliaris =
    (sections.whyBibliaris as Array<{ icon: string; title: string; text: string }>) || [];
  const aboutText = (sections.aboutText as string) || '';
  const categorySlugs = (sections.categorySlugs as string[]) || [];
  const genreSlugs = (sections.genreSlugs as string[]) || [];
  const collectionSlugs = (sections.collectionSlugs as string[]) || [];
  const tagSlugs = (sections.tagSlugs as string[]) || [];

  // Filter taxonomy items by configured slugs (or show first 8)
  const featuredCategories =
    categorySlugs.length > 0
      ? categories.filter((c) => categorySlugs.includes(c.slug || c.id)).slice(0, 8)
      : categories.slice(0, 8);

  const featuredGenres =
    genreSlugs.length > 0
      ? genres.filter((g) => genreSlugs.includes(g.slug || g.id)).slice(0, 8)
      : genres.slice(0, 8);

  const featuredCollections =
    collectionSlugs.length > 0
      ? collections.filter((c) => collectionSlugs.includes(c.slug || c.id)).slice(0, 8)
      : collections.slice(0, 8);

  const featuredTags =
    tagSlugs.length > 0
      ? tags.filter((tag) => tagSlugs.includes(tag.slug || tag.id)).slice(0, 12)
      : tags.slice(0, 12);

  const getCoverUrl = (book: BookOverview): string => {
    const currentLangVersion = book.versions?.find(
      (v) => v.language === supportedLang && v.status === 'published'
    );
    const displayVersion =
      currentLangVersion ||
      book.versions?.find((v) => v.status === 'published') ||
      book.versions?.[0];

    return (
      displayVersion?.coverImageUrl ||
      displayVersion?.coverUrl ||
      book.coverUrl ||
      book.coverImageUrl ||
      ''
    );
  };

  // Get translation helper for taxonomy items
  const getTaxonomyName = (item: Category, lang: SupportedLang): string => {
    const translation =
      item.translations?.find((tr) => tr.language === lang) || item.translations?.[0];
    return translation?.name || item.slug || item.id;
  };

  const getTaxonomySlug = (item: Category, lang: SupportedLang): string => {
    const translation =
      item.translations?.find((tr) => tr.language === lang) || item.translations?.[0];
    return translation?.slug || item.slug || item.id;
  };

  const getTagName = (tag: Tag, lang: SupportedLang): string => {
    const translation =
      tag.translations?.find((tr) => tr.language === lang) || tag.translations?.[0];
    return translation?.name || tag.slug || tag.id;
  };

  const getTagSlug = (tag: Tag, lang: SupportedLang): string => {
    const translation =
      tag.translations?.find((tr) => tr.language === lang) || tag.translations?.[0];
    return translation?.slug || tag.slug || tag.id;
  };

  const faqItems = pageData?.faq as Array<{ question: string; answer: string }> | null | undefined;

  // Hero text from page or fallback to defaults
  const heroTitle = pageData?.h1 || t('home.title');
  const heroText = pageData?.shortDescription || t('home.subtitle');

  return (
    <div className={styles.main}>
      {/* Banner / Hero */}
      <div className={styles.bannerContainer}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerText}>
            <h1 className={styles.bannerTitle}>{heroTitle}</h1>
            <p className={styles.bannerSubtitle}>{heroText}</p>
            <div className={styles.bannerActions}>
              <Link href={`/${supportedLang}/catalog`} passHref legacyBehavior>
                <Button variant="primary" size="lg" className={styles.primaryBtn}>
                  {t('home.browseLibrary')}
                </Button>
              </Link>
              {audiobooksCount > 0 && (
                <Link href={`/${supportedLang}/catalog?type=audio`} passHref legacyBehavior>
                  <Button variant="secondary" size="lg" className={styles.secondaryBtn}>
                    {t('home.audiobooks')}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Book Stack - 4 latest published books (desktop only) */}
          <div className={styles.bookStack}>
            {newReleases.slice(0, 4).map((book, i) => {
              const coverUrl = getCoverUrl(book);
              return (
                <Link
                  key={book.id}
                  href={`/${supportedLang}/book/${book.slug || book.id}`}
                  className={styles.stackBook}
                  style={{
                    height: 130 + i * 15,
                    backgroundColor: 'var(--bibliaris-green)',
                  }}
                >
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={book.title || 'Book cover'}
                      fill
                      sizes="90px"
                      className={styles.stackCover}
                      priority={i < 2}
                    />
                  ) : (
                    <div className={styles.stackCoverPlaceholder}>
                      <BookOpen size={24} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.sectionsContainer}>
        {/* Featured Books */}
        <BookSection
          title={t('home.topPopular')}
          books={featuredBooks}
          viewMoreHref={`/${supportedLang}/catalog?sort=popular`}
          priorityCount={4}
        />

        {/* Browse by Category */}
        {featuredCategories.length > 0 && (
          <section className={`${styles.genresSection} ${styles.belowFold}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('home.browseByCategory')}</h2>
              <Link href={`/${supportedLang}/categories`} passHref legacyBehavior>
                <Button variant="ghost" className={styles.viewMoreBtn}>
                  {t('home.viewAll')} <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
            <div className={styles.genresCarousel}>
              {featuredCategories.map((cat) => {
                const name = getTaxonomyName(cat, supportedLang);
                const catSlug = getTaxonomySlug(cat, supportedLang);
                return (
                  <Link
                    key={cat.id}
                    href={`/${supportedLang}/category/${catSlug}`}
                    className={styles.genreCard}
                    style={{ backgroundColor: 'var(--bibliaris-green)' }}
                  >
                    <div className={styles.genreOverlay} />
                    <div className={styles.genreInfo}>
                      <p className={styles.genreName}>{name}</p>
                      <p className={styles.genreCount}>
                        {cat.booksCount || 0} {t('home.booksCount')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Explore by Genre */}
        {featuredGenres.length > 0 && (
          <section className={`${styles.genresSection} ${styles.belowFold}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('home.genres')}</h2>
              <Link href={`/${supportedLang}/genres`} passHref legacyBehavior>
                <Button variant="ghost" className={styles.viewMoreBtn}>
                  {t('home.viewAll')} <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
            <div className={styles.genresCarousel}>
              {featuredGenres.map((genre) => {
                const name = getTaxonomyName(genre, supportedLang);
                const slug = getTaxonomySlug(genre, supportedLang);
                return (
                  <Link
                    key={genre.id}
                    href={`/${supportedLang}/genre/${slug}`}
                    className={styles.genreCard}
                    style={{ backgroundColor: 'var(--bibliaris-green)' }}
                  >
                    <div className={styles.genreOverlay} />
                    <div className={styles.genreInfo}>
                      <p className={styles.genreName}>{name}</p>
                      <p className={styles.genreCount}>
                        {genre.booksCount || 0} {t('home.booksCount')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Curated Collections */}
        {featuredCollections.length > 0 && (
          <section className={`${styles.genresSection} ${styles.belowFold}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('home.curatedCollections')}</h2>
              <Link href={`/${supportedLang}/collections`} passHref legacyBehavior>
                <Button variant="ghost" className={styles.viewMoreBtn}>
                  {t('home.viewAll')} <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
            <div className={styles.genresCarousel}>
              {featuredCollections.map((col) => {
                const name = getTaxonomyName(col, supportedLang);
                const slug = getTaxonomySlug(col, supportedLang);
                return (
                  <Link
                    key={col.id}
                    href={`/${supportedLang}/collection/${slug}`}
                    className={styles.genreCard}
                    style={{ backgroundColor: 'var(--bibliaris-green)' }}
                  >
                    <div className={styles.genreOverlay} />
                    <div className={styles.genreInfo}>
                      <p className={styles.genreName}>{name}</p>
                      <p className={styles.genreCount}>
                        {col.booksCount || 0} {t('home.booksCount')}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* New Releases */}
        <BookSection
          title={t('home.newReleases')}
          books={newReleases}
          viewMoreHref={`/${supportedLang}/catalog?sort=new`}
        />

        {/* Explore Book Themes (Tags) */}
        {featuredTags.length > 0 && (
          <section className={`${styles.genresSection} ${styles.belowFold}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('home.exploreBookThemes')}</h2>
              <Link href={`/${supportedLang}/tags`} passHref legacyBehavior>
                <Button variant="ghost" className={styles.viewMoreBtn}>
                  {t('home.viewAll')} <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
            <div className={styles.genresCarousel}>
              {featuredTags.map((tag) => {
                const name = getTagName(tag, supportedLang);
                const slug = getTagSlug(tag, supportedLang);
                return (
                  <Link
                    key={tag.id}
                    href={`/${supportedLang}/tag/${slug}`}
                    className={styles.genreCard}
                    style={{ backgroundColor: 'var(--bibliaris-green)' }}
                  >
                    <div className={styles.genreOverlay} />
                    <div className={styles.genreInfo}>
                      <p className={styles.genreName}>{name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Audiobooks */}
        {audiobooks.length > 0 && (
          <BookSection
            title={t('home.audiobooks')}
            books={audiobooks}
            viewMoreHref={`/${supportedLang}/catalog?type=audio`}
          />
        )}

        {/* Classic Literature */}
        {classicBooks.length > 0 && (
          <BookSection
            title={t('home.classicLiterature')}
            books={classicBooks}
            viewMoreHref={`/${supportedLang}/catalog/classics`}
          />
        )}

        {/* Fantasy & Adventure */}
        {fantasyBooks.length > 0 && (
          <BookSection
            title={t('home.fantasyAdventure')}
            books={fantasyBooks}
            viewMoreHref={`/${supportedLang}/catalog/fantasy`}
          />
        )}

        {/* Why Bibliaris */}
        {whyBibliaris.length > 0 && (
          <div className={styles.belowFold}>
            <QuotesBlock
              items={whyBibliaris.map((item) => ({
                text: item.text,
                source: item.title,
              }))}
              title={t('home.whyBibliaris')}
            />
          </div>
        )}

        {/* About Bibliaris (SEO text) */}
        {aboutText && (
          <section className={`${styles.seoSection} ${styles.belowFold}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('home.aboutBibliaris')}</h2>
            </div>
            <div className={styles.seoContent}>
              {aboutText.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faqItems && faqItems.length > 0 && (
          <div className={styles.belowFold}>
            <FaqBlock items={faqItems} title={t('home.faq')} icon={<HelpCircle size={20} />} />
          </div>
        )}
      </div>
    </div>
  );
}
