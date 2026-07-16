'use client';

import { BookOpen, ChevronRight, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCategories } from '@/api/hooks/useCategories';
import { usePage } from '@/api/hooks/usePublic';
import { useTags } from '@/api/hooks/useTags';
import { Button } from '@/components/common/Button';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
import { BookSection } from '@/components/public/books/BookSection';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  AuthorListItem,
  BookCardModel,
  BookCollectionData,
  Category,
  PageResponse,
  Tag,
} from '@/types/api-schema';
import styles from '../page.module.scss';

type HomeClientProps = {
  lang: string;
  initialBooks?: BookCardModel[];
  initialCategories?: Category[];
  initialGenres?: Category[];
  initialCollections?: Category[];
  initialTags?: Tag[];
  initialAuthors?: AuthorListItem[];
  initialPage?: PageResponse | null;
  initialCollectionBooks?: BookCollectionData[];
  audiobooksCount?: number;
};

export default function HomeClient({
  lang,
  initialBooks,
  initialCategories,
  initialGenres,
  initialCollections,
  initialTags,
  initialAuthors,
  initialPage,
  initialCollectionBooks,
  audiobooksCount = 0,
}: HomeClientProps) {
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();

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
  // BookCardModel[] already filtered to the requested language & published on the backend.
  const allBooks: BookCardModel[] = initialBooks || [];
  const categories = categoriesData?.data || [];
  const genres = genresData?.data || [];
  const collections = collectionsData?.data || [];
  const tags = tagsData?.data || [];

  const featuredBooks = [...allBooks]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

  const newReleases = [...allBooks]
    .sort((a, b) => {
      const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 10);

  const audiobooks = allBooks.filter((book) => book.hasAudio === true).slice(0, 10);

  // Category-based sections: match by stable categoryIds against categories list
  // (by id, slug, or localized name containing the keyword).
  const matchesCategory = (book: BookCardModel, keyword: string, slugHints: string[]): boolean =>
    book.categoryIds.some((cid) => {
      const cat = categories.find((c) => c.id === cid);
      if (!cat) return false;
      if (slugHints.includes(cat.slug)) return true;
      return cat.translations?.some((tr) => tr.name.toLowerCase().includes(keyword)) ?? false;
    });

  const classicBooks = allBooks
    .filter((book) =>
      matchesCategory(book, 'classic', ['classics', 'classic-literature', 'classic'])
    )
    .slice(0, 8);

  const fantasyBooks = allBooks
    .filter((book) => matchesCategory(book, 'fantasy', ['fantasy', 'sci-fi-fantasy']))
    .slice(0, 8);

  // Sections config from page
  const whyBibliaris =
    (sections.whyBibliaris as Array<{ icon: string; title: string; text: string }>) || [];
  const aboutText = (sections.aboutText as string) || '';

  // Top taxonomy items by book count (max 12)
  const featuredCategories = [...categories]
    .sort((a, b) => (b.booksCount || 0) - (a.booksCount || 0))
    .slice(0, 12);

  const featuredGenres = [...genres]
    .sort((a, b) => (b.booksCount || 0) - (a.booksCount || 0))
    .slice(0, 12);

  const featuredCollections = [...collections]
    .sort((a, b) => (b.booksCount || 0) - (a.booksCount || 0))
    .slice(0, 12);

  const featuredTags = [...tags]
    .sort((a, b) => (b.booksCount || 0) - (a.booksCount || 0))
    .slice(0, 12);

  const featuredAuthors = [...(initialAuthors || [])]
    .sort((a, b) => b.booksCount - a.booksCount)
    .slice(0, 12);

  const getCollectionAtPosition = (pos: string) =>
    initialCollectionBooks?.filter((c) => c.position === pos);

  const renderCollections = (pos: string) =>
    getCollectionAtPosition(pos)?.map((col, i) => (
      <BookSection
        key={`collection-${pos}-${i}`}
        title={col.title}
        subtitle={col.description}
        books={col.books}
      />
    ));

  const getAuthorDisplayName = (author: AuthorListItem): string => {
    const translation =
      author.translations?.find((tr) => tr.language === supportedLang) || author.translations?.[0];
    return translation?.name || '';
  };

  const getCoverUrl = (book: BookCardModel): string => book.coverImageUrl || '';

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

        {renderCollections('after-categories')}

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

        {renderCollections('after-genres')}

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

        {renderCollections('after-collections')}

        {/* New Releases */}
        <BookSection
          title={t('home.newReleases')}
          books={newReleases}
          viewMoreHref={`/${supportedLang}/catalog?sort=new`}
        />

        {renderCollections('after-new-releases')}

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

        {renderCollections('after-tags')}

        {/* Audiobooks */}
        {audiobooks.length > 0 && (
          <BookSection
            title={t('home.audiobooks')}
            books={audiobooks}
            viewMoreHref={`/${supportedLang}/catalog?type=audio`}
          />
        )}

        {renderCollections('after-audiobooks')}

        {/* Classic Literature */}
        {classicBooks.length > 0 && (
          <BookSection
            title={t('home.classicLiterature')}
            books={classicBooks}
            viewMoreHref={`/${supportedLang}/catalog/classics`}
          />
        )}

        {renderCollections('after-classic')}

        {/* Fantasy & Adventure */}
        {fantasyBooks.length > 0 && (
          <BookSection
            title={t('home.fantasyAdventure')}
            books={fantasyBooks}
            viewMoreHref={`/${supportedLang}/catalog/fantasy`}
          />
        )}

        {renderCollections('after-fantasy')}

        {/* Featured Authors */}
        {featuredAuthors.length > 0 && (
          <section className={`${styles.genresSection} ${styles.belowFold}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t('home.authors')}</h2>
              <Link href={`/${supportedLang}/authors`} passHref legacyBehavior>
                <Button variant="ghost" className={styles.viewMoreBtn}>
                  {t('home.viewAll')} <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
            <div className={styles.authorCarousel}>
              {featuredAuthors.map((author) => {
                const name = getAuthorDisplayName(author);
                return (
                  <Link
                    key={author.id}
                    href={`/${supportedLang}/author/${author.slug}`}
                    className={styles.authorCard}
                  >
                    <div className={styles.authorAvatar}>
                      {author.photoUrl ? (
                        <Image
                          src={author.photoUrl}
                          alt={name}
                          fill
                          className={styles.authorAvatarImg}
                        />
                      ) : (
                        <span className={styles.authorAvatarPlaceholder}>
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className={styles.authorInfo}>
                      <span className={styles.authorName}>{name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {renderCollections('after-authors')}

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
