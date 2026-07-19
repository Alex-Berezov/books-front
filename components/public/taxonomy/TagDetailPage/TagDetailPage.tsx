import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { BookCard } from '@/components/public/books/BookCard';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Tag, TagBookCardsResponse, TagTranslation } from '@/types/api-schema';
import { TagDetailInteractions } from './TagDetailInteractions';
import styles from './TagDetailPage.module.scss';

interface TagDetailPageProps {
  lang: SupportedLang;
  tagSlug: string;
  data: TagBookCardsResponse;
  translations: {
    breadcrumbHome: string;
    allTags: string;
    browse: string;
    allBooks: string;
    allBooksLink: string;
    tagsLink: string;
    exploreMore: string;
    books: string;
    noBooks: string;
    showMore: string;
    showLess: string;
    about: string;
    faqTitle: string;
    relatedTags: string;
    relatedGenres: string;
    relatedCategories: string;
    relatedCollections: string;
  };
  currentPage: number;
  totalPages: number;
  total: number;
}

export function TagDetailPage({
  lang,
  tagSlug,
  data,
  translations,
  currentPage,
  totalPages,
  total,
}: TagDetailPageProps) {
  const tag = data.tag as Tag | null;
  const items = data.items;

  const tagTranslation = (tag?.translation ||
    tag?.translations?.[0] ||
    null) as TagTranslation | null;

  const tagName = tagTranslation?.h1 || tagTranslation?.name || tag?.name || tagSlug;
  const tagDescription = tagTranslation?.description || '';
  const tagShortDescription = tagTranslation?.shortDescription || '';
  const tagFaq = tagTranslation?.faq || [];
  const relatedTagSlugs = tagTranslation?.relatedTagSlugs || [];
  const relatedGenreSlugs = tagTranslation?.relatedGenreSlugs || [];
  const relatedCategorySlugs = tagTranslation?.relatedCategorySlugs || [];
  const relatedCollectionSlugs = tagTranslation?.relatedCollectionSlugs || [];

  const breadcrumbItems = [
    { label: translations.breadcrumbHome, href: `/${lang}` },
    { label: translations.allTags, href: `/${lang}/tags` },
    { label: tagName },
  ];

  return (
    <div className={styles.tagPage}>
      <div className={styles.container}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.stickySidebar}>
              <h3 className={styles.sidebarTitle}>{translations.browse}</h3>
              <nav className={styles.sidebarNav}>
                <Link href={`/${lang}/catalog`} className={styles.sidebarLink}>
                  {translations.allBooks}
                </Link>
                <Link href={`/${lang}/tags`} className={styles.sidebarLink}>
                  {translations.allTags}
                </Link>
              </nav>
            </div>
          </aside>

          <div className={styles.main}>
            <Breadcrumbs items={breadcrumbItems} emitJsonLd={false} />

            <header className={styles.hero}>
              <h1 className={styles.title}>{tagName}</h1>
              {tagShortDescription && (
                <p className={styles.shortDescription}>{tagShortDescription}</p>
              )}
              {total > 0 && (
                <p className={styles.count}>
                  {total} {translations.books}
                </p>
              )}
            </header>

            {items.length === 0 ? (
              <div className={styles.empty}>
                <BookOpen size={48} />
                <p>{translations.noBooks}</p>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {items.map((book) => (
                    <BookCard key={book.id} book={book} size="md" />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className={styles.pagination} aria-label="Pagination">
                    {currentPage > 1 && (
                      <Link
                        href={`/${lang}/tag/${tagSlug}?page=${currentPage - 1}`}
                        className={styles.paginationLink}
                      >
                        ←
                      </Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                      .map((p, idx, arr) => (
                        <span key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className={styles.paginationLink}>...</span>
                          )}
                          <Link
                            href={`/${lang}/tag/${tagSlug}?page=${p}`}
                            className={`${styles.paginationLink} ${p === currentPage ? styles.paginationActive : ''}`}
                          >
                            {p}
                          </Link>
                        </span>
                      ))}
                    {currentPage < totalPages && (
                      <Link
                        href={`/${lang}/tag/${tagSlug}?page=${currentPage + 1}`}
                        className={styles.paginationLink}
                      >
                        →
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}

            <TagDetailInteractions
              description={tagDescription}
              descriptionSectionTitle={translations.about?.replace('{name}', tagName) || tagName}
              showMoreLabel={translations.showMore}
              showLessLabel={translations.showLess}
            />

            {relatedTagSlugs.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{translations.relatedTags}</h2>
                <div className={styles.relatedChips}>
                  {relatedTagSlugs.map((slug: string) => (
                    <Link key={slug} href={`/${lang}/tag/${slug}`} className={styles.relatedChip}>
                      {slug}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {relatedGenreSlugs.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{translations.relatedGenres}</h2>
                <div className={styles.relatedChips}>
                  {relatedGenreSlugs.map((slug: string) => (
                    <Link key={slug} href={`/${lang}/genre/${slug}`} className={styles.relatedChip}>
                      {slug}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {relatedCategorySlugs.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{translations.relatedCategories}</h2>
                <div className={styles.relatedChips}>
                  {relatedCategorySlugs.map((slug: string) => (
                    <Link
                      key={slug}
                      href={`/${lang}/category/${slug}`}
                      className={styles.relatedChip}
                    >
                      {slug}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {relatedCollectionSlugs.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{translations.relatedCollections}</h2>
                <div className={styles.relatedChips}>
                  {relatedCollectionSlugs.map((slug: string) => (
                    <Link
                      key={slug}
                      href={`/${lang}/collection/${slug}`}
                      className={styles.relatedChip}
                    >
                      {slug}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {tagFaq.length > 0 && (
              <FaqBlock
                items={tagFaq as Array<{ question: string; answer: string }>}
                title={translations.faqTitle}
                className={styles.faqSection}
              />
            )}

            <section className={styles.bottomLinks}>
              <h2 className={styles.sectionTitle}>{translations.exploreMore}</h2>
              <div className={styles.bottomLinksList}>
                <Link href={`/${lang}/tags`} className={styles.bottomLink}>
                  {translations.tagsLink}
                </Link>
                <Link href={`/${lang}/catalog`} className={styles.bottomLink}>
                  {translations.allBooksLink}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
