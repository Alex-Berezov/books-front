import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { BookCard } from '@/components/public/books/BookCard';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { PageBackButton } from '@/components/public/navigation';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { RelatedTerm, Tag, TagBookCardsResponse, TagTranslation } from '@/types/api-schema';
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
    paginationLabel: string;
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
  /**
   * 🔴 Раньше здесь брались сырые `related*Slugs` из перевода и рендерились как
   * есть: существование термина не проверялось, видимость и индексируемость
   * тоже, а текстом ссылки шёл сам слаг. Замер на проде 09.08.2026 по `en`: из
   * 1039 таких ссылок 114 вели на несуществующий термин (56 уникальных → 404) и
   * 622 — на закрытый `noindex`. Живыми были 303.
   *
   * Теперь бэкенд разрешает слаги в термины и отдаёт факты, а решение принимает
   * `isTaxonomyLinkable` — тот же предикат, что у sitemap и внутренних ссылок.
   * Свой порог здесь заводить нельзя: расхождение предикатов и есть дефект.
   */
  const relatedTerms = tag?.relatedTerms;
  const linkable = (terms: RelatedTerm[] | undefined) =>
    (terms ?? []).filter((term) =>
      isTaxonomyLinkable({
        isVisible: term.isVisible,
        indexable: term.indexable,
        autoIndexable: term.autoIndexable,
        booksCount: term.langBookCount,
      })
    );

  const relatedTagLinks = linkable(relatedTerms?.tags);
  const relatedGenreLinks = linkable(relatedTerms?.genres);
  const relatedCategoryLinks = linkable(relatedTerms?.categories);
  const relatedCollectionLinks = linkable(relatedTerms?.collections);

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

            <PageBackButton lang={lang} />

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
                  <nav className={styles.pagination} aria-label={translations.paginationLabel}>
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

            {relatedTagLinks.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{translations.relatedTags}</h2>
                <div className={styles.relatedChips}>
                  {relatedTagLinks.map((term) => (
                    <Link
                      key={term.slug}
                      href={`/${lang}/tag/${term.slug}`}
                      className={styles.relatedChip}
                    >
                      {term.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {relatedGenreLinks.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{translations.relatedGenres}</h2>
                <div className={styles.relatedChips}>
                  {relatedGenreLinks.map((term) => (
                    <Link
                      key={term.slug}
                      href={`/${lang}/genre/${term.slug}`}
                      className={styles.relatedChip}
                    >
                      {term.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {relatedCategoryLinks.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{translations.relatedCategories}</h2>
                <div className={styles.relatedChips}>
                  {relatedCategoryLinks.map((term) => (
                    <Link
                      key={term.slug}
                      href={`/${lang}/category/${term.slug}`}
                      className={styles.relatedChip}
                    >
                      {term.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {relatedCollectionLinks.length > 0 && (
              <section className={styles.relatedSection}>
                <h2 className={styles.sectionTitle}>{translations.relatedCollections}</h2>
                <div className={styles.relatedChips}>
                  {relatedCollectionLinks.map((term) => (
                    <Link
                      key={term.slug}
                      href={`/${lang}/collection/${term.slug}`}
                      className={styles.relatedChip}
                    >
                      {term.name}
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
