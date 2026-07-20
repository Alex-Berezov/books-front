import { BookOpen, ChevronRight, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
import { BookSectionServer } from '@/components/public/books/BookSectionServer/BookSectionServer';
import type { AuthorListItem, BookCardModel, BookCollectionData } from '@/types/api-schema';
import pageStyles from '../../../../app/page.module.scss';

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  booksCount: number;
  translations?: Array<{ language: string; name: string; slug: string }>;
}

interface HomePageContentLabels {
  heroTitle: string;
  heroText: string;
  browseLibrary: string;
  audiobooks: string;
  topPopular: string;
  browseByCategory: string;
  viewAll: string;
  booksCount: string;
  genres: string;
  curatedCollections: string;
  newReleases: string;
  exploreBookThemes: string;
  classicLiterature: string;
  fantasyAdventure: string;
  authors: string;
  whyBibliaris: string;
  aboutBibliaris: string;
  faq: string;
  viewMore: string;
  readLabel: string;
  listenLabel: string;
  newLabel: string;
  coverAltTemplate: string;
  unknownAuthor: string;
}

interface HomePageContentProps {
  lang: string;
  labels: HomePageContentLabels;
  featuredBooks: BookCardModel[];
  newReleases: BookCardModel[];
  audiobooks: BookCardModel[];
  classicBooks: BookCardModel[];
  fantasyBooks: BookCardModel[];
  featuredCategories: TaxonomyItem[];
  featuredGenres: TaxonomyItem[];
  featuredCollections: TaxonomyItem[];
  featuredTags: TaxonomyItem[];
  featuredAuthors: AuthorListItem[];
  collectionSections: BookCollectionData[];
  heroStackBooks: BookCardModel[];
  audiobooksCount: number;
  faqItems: Array<{ question: string; answer: string }> | null;
  whyBibliaris: Array<{ icon: string; title: string; text: string }>;
  aboutText: string;
}

function buildAltText(
  template: string,
  title: string,
  author: string,
  unknownAuthor: string
): string {
  return template.replace('{title}', title).replace('{author}', author || unknownAuthor);
}

function getDisplayName(item: TaxonomyItem | AuthorListItem, lang: string): string {
  const translations = 'translations' in item ? (item as TaxonomyItem).translations : undefined;
  if (translations?.length) {
    const tr = translations.find((t) => t.language === lang) || translations[0];
    if (tr?.name) return tr.name;
  }
  return (item as TaxonomyItem).name || '';
}

function getSlug(item: TaxonomyItem | AuthorListItem, lang: string): string {
  const translations = 'translations' in item ? (item as TaxonomyItem).translations : undefined;
  if (translations?.length) {
    const tr = translations.find((t) => t.language === lang) || translations[0];
    if (tr?.slug) return tr.slug;
  }
  return (item as TaxonomyItem).slug || '';
}

function getAuthorDisplayName(author: AuthorListItem, lang: string): string {
  const translations = author.translations || [];
  const tr = translations.find((t) => t.language === lang) || translations[0];
  return tr?.name || '';
}

function renderCollections(
  collections: BookCollectionData[],
  pos: string,
  lang: string,
  labels: HomePageContentLabels
) {
  return collections
    .filter((c) => c.position === pos)
    .map((col, i) => (
      <BookSectionServer
        key={`collection-${pos}-${i}`}
        title={col.title}
        subtitle={col.description}
        books={col.books}
        lang={lang}
        labels={{
          viewMoreLabel: labels.viewMore,
          bookCardLabels: {
            coverAltTemplate: labels.coverAltTemplate,
            readLabel: labels.readLabel,
            listenLabel: labels.listenLabel,
            newLabel: labels.newLabel,
            unknownAuthor: labels.unknownAuthor,
          },
        }}
      />
    ));
}

export function HomePageContent({
  lang,
  labels,
  featuredBooks,
  newReleases,
  audiobooks,
  classicBooks,
  fantasyBooks,
  featuredCategories,
  featuredGenres,
  featuredCollections,
  featuredTags,
  featuredAuthors,
  collectionSections,
  heroStackBooks,
  audiobooksCount,
  faqItems,
  whyBibliaris,
  aboutText,
}: HomePageContentProps) {
  const bookCardLabels = {
    coverAltTemplate: labels.coverAltTemplate,
    readLabel: labels.readLabel,
    listenLabel: labels.listenLabel,
    newLabel: labels.newLabel,
    unknownAuthor: labels.unknownAuthor,
  };

  return (
    <div className={pageStyles.main}>
      {/* Banner / Hero */}
      <div className={pageStyles.bannerContainer}>
        <div className={pageStyles.bannerContent}>
          <div className={pageStyles.bannerText}>
            <h1 className={pageStyles.bannerTitle}>{labels.heroTitle}</h1>
            <p className={pageStyles.bannerSubtitle}>{labels.heroText}</p>
            <div className={pageStyles.bannerActions}>
              <Link href={`/${lang}/catalog`} className={pageStyles.primaryBtn}>
                {labels.browseLibrary}
              </Link>
              {audiobooksCount > 0 && (
                <Link href={`/${lang}/audiobooks`} className={pageStyles.secondaryBtn}>
                  {labels.audiobooks}
                </Link>
              )}
            </div>
          </div>

          {/* Book Stack - 4 latest published books (desktop only) */}
          <div className={pageStyles.bookStack}>
            {heroStackBooks.map((book, i) => {
              const coverUrl = book.coverImageUrl || '';
              return (
                <Link
                  key={book.id}
                  href={`/${lang}/book/${book.slug || book.id}`}
                  className={pageStyles.stackBook}
                  style={{
                    height: 130 + i * 15,
                    backgroundColor: 'var(--bibliaris-green)',
                  }}
                >
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={buildAltText(
                        labels.coverAltTemplate,
                        book.title,
                        book.author,
                        labels.unknownAuthor
                      )}
                      fill
                      sizes="90px"
                      className={pageStyles.stackCover}
                      quality={70}
                      priority={i === 0}
                    />
                  ) : (
                    <div className={pageStyles.stackCoverPlaceholder}>
                      <BookOpen size={24} />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className={pageStyles.sectionsContainer}>
        {/* Featured Books */}
        <BookSectionServer
          title={labels.topPopular}
          books={featuredBooks}
          lang={lang}
          labels={{ viewMoreLabel: labels.viewMore, bookCardLabels }}
          viewMoreHref={`/${lang}/popular-books`}
          priorityCount={2}
        />

        {/* Browse by Category */}
        {featuredCategories.length > 0 && (
          <section className={`${pageStyles.genresSection} ${pageStyles.belowFold}`}>
            <div className={pageStyles.sectionHeader}>
              <h2 className={pageStyles.sectionTitle}>{labels.browseByCategory}</h2>
              <Link href={`/${lang}/categories`} className={pageStyles.viewMoreBtn}>
                {labels.viewAll} <ChevronRight size={16} />
              </Link>
            </div>
            <div className={pageStyles.genresCarousel}>
              {featuredCategories.map((cat) => {
                const name = getDisplayName(cat, lang);
                const slug = getSlug(cat, lang);
                return (
                  <Link
                    key={cat.id}
                    href={`/${lang}/category/${slug}`}
                    className={pageStyles.genreCard}
                  >
                    <div className={pageStyles.genreOverlay} />
                    <div className={pageStyles.genreInfo}>
                      <p className={pageStyles.genreName}>{name}</p>
                      <p className={pageStyles.genreCount}>
                        {cat.booksCount || 0} {labels.booksCount}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {renderCollections(collectionSections, 'after-categories', lang, labels)}

        {/* Explore by Genre */}
        {featuredGenres.length > 0 && (
          <section className={`${pageStyles.genresSection} ${pageStyles.belowFold}`}>
            <div className={pageStyles.sectionHeader}>
              <h2 className={pageStyles.sectionTitle}>{labels.genres}</h2>
              <Link href={`/${lang}/genres`} className={pageStyles.viewMoreBtn}>
                {labels.viewAll} <ChevronRight size={16} />
              </Link>
            </div>
            <div className={pageStyles.genresCarousel}>
              {featuredGenres.map((genre) => {
                const name = getDisplayName(genre, lang);
                const slug = getSlug(genre, lang);
                return (
                  <Link
                    key={genre.id}
                    href={`/${lang}/genre/${slug}`}
                    className={pageStyles.genreCard}
                  >
                    <div className={pageStyles.genreOverlay} />
                    <div className={pageStyles.genreInfo}>
                      <p className={pageStyles.genreName}>{name}</p>
                      <p className={pageStyles.genreCount}>
                        {genre.booksCount || 0} {labels.booksCount}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {renderCollections(collectionSections, 'after-genres', lang, labels)}

        {/* Curated Collections */}
        {featuredCollections.length > 0 && (
          <section className={`${pageStyles.genresSection} ${pageStyles.belowFold}`}>
            <div className={pageStyles.sectionHeader}>
              <h2 className={pageStyles.sectionTitle}>{labels.curatedCollections}</h2>
              <Link href={`/${lang}/collections`} className={pageStyles.viewMoreBtn}>
                {labels.viewAll} <ChevronRight size={16} />
              </Link>
            </div>
            <div className={pageStyles.genresCarousel}>
              {featuredCollections.map((col) => {
                const name = getDisplayName(col, lang);
                const slug = getSlug(col, lang);
                return (
                  <Link
                    key={col.id}
                    href={`/${lang}/collection/${slug}`}
                    className={pageStyles.genreCard}
                  >
                    <div className={pageStyles.genreOverlay} />
                    <div className={pageStyles.genreInfo}>
                      <p className={pageStyles.genreName}>{name}</p>
                      <p className={pageStyles.genreCount}>
                        {col.booksCount || 0} {labels.booksCount}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {renderCollections(collectionSections, 'after-collections', lang, labels)}

        {/* New Releases */}
        <BookSectionServer
          title={labels.newReleases}
          books={newReleases}
          lang={lang}
          labels={{ viewMoreLabel: labels.viewMore, bookCardLabels }}
          viewMoreHref={`/${lang}/new-releases`}
        />

        {renderCollections(collectionSections, 'after-new-releases', lang, labels)}

        {/* Explore Book Themes (Tags) */}
        {featuredTags.length > 0 && (
          <section className={`${pageStyles.genresSection} ${pageStyles.belowFold}`}>
            <div className={pageStyles.sectionHeader}>
              <h2 className={pageStyles.sectionTitle}>{labels.exploreBookThemes}</h2>
              <Link href={`/${lang}/tags`} className={pageStyles.viewMoreBtn}>
                {labels.viewAll} <ChevronRight size={16} />
              </Link>
            </div>
            <div className={pageStyles.genresCarousel}>
              {featuredTags.map((tag) => {
                const name = getDisplayName(tag, lang);
                const slug = getSlug(tag, lang);
                return (
                  <Link key={tag.id} href={`/${lang}/tag/${slug}`} className={pageStyles.genreCard}>
                    <div className={pageStyles.genreOverlay} />
                    <div className={pageStyles.genreInfo}>
                      <p className={pageStyles.genreName}>{name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {renderCollections(collectionSections, 'after-tags', lang, labels)}

        {/* Audiobooks */}
        {audiobooks.length > 0 && (
          <BookSectionServer
            title={labels.audiobooks}
            books={audiobooks}
            lang={lang}
            labels={{ viewMoreLabel: labels.viewMore, bookCardLabels }}
            viewMoreHref={`/${lang}/audiobooks`}
          />
        )}

        {renderCollections(collectionSections, 'after-audiobooks', lang, labels)}

        {/* Classic Literature */}
        {classicBooks.length > 0 && (
          <BookSectionServer
            title={labels.classicLiterature}
            books={classicBooks}
            lang={lang}
            labels={{ viewMoreLabel: labels.viewMore, bookCardLabels }}
            viewMoreHref={`/${lang}/catalog/classics`}
          />
        )}

        {renderCollections(collectionSections, 'after-classic', lang, labels)}

        {/* Fantasy & Adventure */}
        {fantasyBooks.length > 0 && (
          <BookSectionServer
            title={labels.fantasyAdventure}
            books={fantasyBooks}
            lang={lang}
            labels={{ viewMoreLabel: labels.viewMore, bookCardLabels }}
            viewMoreHref={`/${lang}/catalog/fantasy`}
          />
        )}

        {renderCollections(collectionSections, 'after-fantasy', lang, labels)}

        {/* Featured Authors */}
        {featuredAuthors.length > 0 && (
          <section className={`${pageStyles.genresSection} ${pageStyles.belowFold}`}>
            <div className={pageStyles.sectionHeader}>
              <h2 className={pageStyles.sectionTitle}>{labels.authors}</h2>
              <Link href={`/${lang}/authors`} className={pageStyles.viewMoreBtn}>
                {labels.viewAll} <ChevronRight size={16} />
              </Link>
            </div>
            <div className={pageStyles.authorCarousel}>
              {featuredAuthors.map((author) => {
                const name = getAuthorDisplayName(author, lang);
                return (
                  <Link
                    key={author.id}
                    href={`/${lang}/author/${author.slug}`}
                    className={pageStyles.authorCard}
                  >
                    <div className={pageStyles.authorAvatar}>
                      {author.photoUrl ? (
                        <Image
                          src={author.photoUrl}
                          alt={name}
                          fill
                          className={pageStyles.authorAvatarImg}
                        />
                      ) : (
                        <span className={pageStyles.authorAvatarPlaceholder}>
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className={pageStyles.authorInfo}>
                      <span className={pageStyles.authorName}>{name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {renderCollections(collectionSections, 'after-authors', lang, labels)}

        {/* Why Bibliaris */}
        {whyBibliaris.length > 0 && (
          <div className={pageStyles.belowFold}>
            <QuotesBlock
              items={whyBibliaris.map((item) => ({
                text: item.text,
                source: item.title,
              }))}
              title={labels.whyBibliaris}
            />
          </div>
        )}

        {/* About Bibliaris (SEO text) */}
        {aboutText && (
          <section className={`${pageStyles.seoSection} ${pageStyles.belowFold}`}>
            <div className={pageStyles.sectionHeader}>
              <h2 className={pageStyles.sectionTitle}>{labels.aboutBibliaris}</h2>
            </div>
            <div className={pageStyles.seoContent}>
              {aboutText.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faqItems && faqItems.length > 0 && (
          <div className={pageStyles.belowFold}>
            <FaqBlock items={faqItems} title={labels.faq} icon={<HelpCircle size={20} />} />
          </div>
        )}
      </div>
    </div>
  );
}
