import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { BookCard } from '@/components/public/books/BookCard';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Category, CategoryBookCardsResponse, CategoryTranslation } from '@/types/api-schema';
import { TaxonomyDetailInteractions } from './TaxonomyDetailInteractions';
import styles from './TaxonomyDetailPage.module.scss';

interface TaxonomyLink {
  id: string;
  name: string;
  slug: string;
  booksCount: number;
}

type CategoryType = 'category' | 'genre' | 'collection';

interface TaxonomyDetailPageProps {
  lang: SupportedLang;
  slug: string;
  taxonomyType: CategoryType;
  data: CategoryBookCardsResponse | null;
  allCategories: Category[];
  translations: {
    breadcrumbHome: string;
    breadcrumbLabel: string;
    currentSection: string;
    allLabel: string;
    allBooksLabel: string;
    browseLabel: string;
    exploreMoreLabel: string;
    allBooksLink: string;
    tagsLink: string;
    linkLabel: string;
    booksCount: string;
    relatedGenres: string;
    relatedCategories: string;
    relatedCollections: string;
    relatedTags: string;
    aboutSection: string;
    faqTitle: string;
    showMore: string;
    showLess: string;
    noBooks: string;
  };
  path: string;
  currentPage: number;
  totalPages: number;
  total: number;
}

function SidebarBlock({
  title,
  items,
  path,
  lang,
}: {
  title: string;
  items: TaxonomyLink[];
  path: string;
  lang: string;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <h4 className={styles.sidebarSubtitle}>{title}</h4>
      <nav className={styles.sidebarNav}>
        {items.slice(0, 8).map((item) => (
          <Link key={item.id} href={`/${lang}/${path}/${item.slug}`} className={styles.sidebarLink}>
            {item.name}
          </Link>
        ))}
      </nav>
    </>
  );
}

function getTaxonomyName(cat: Category, lang: SupportedLang): string {
  const translation = cat.translation || cat.translations?.find((t) => t.language === lang) || null;
  return (translation as CategoryTranslation | null)?.name || cat.name || '';
}

function getTaxonomySlug(cat: Category, lang: SupportedLang): string {
  const translation = cat.translation || cat.translations?.find((t) => t.language === lang) || null;
  return (translation as CategoryTranslation | null)?.slug || cat.slug || '';
}

function getParentCategory(category: Category, allCategories: Category[]): Category | null {
  if (!category.parentId) return null;
  return allCategories.find((cat) => cat.id === category.parentId) || null;
}

function getChildCategories(category: Category, allCategories: Category[]): Category[] {
  return allCategories
    .filter((cat) => cat.parentId === category.id)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

function getSiblingCategories(category: Category, allCategories: Category[]): Category[] {
  return allCategories
    .filter(
      (cat) =>
        cat.parentId === (category.parentId || null) &&
        cat.id !== category.id &&
        cat.isVisible !== false &&
        (cat.booksCount || 0) > 0
    )
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 10);
}

function getRelatedByType(
  allCategories: Category[],
  currentId: string,
  targetType: CategoryType,
  lang: SupportedLang,
  limit = 8
): TaxonomyLink[] {
  return allCategories
    .filter(
      (cat) =>
        cat.id !== currentId &&
        cat.type === targetType &&
        cat.isVisible !== false &&
        (cat.booksCount || 0) > 0
    )
    .sort((a, b) => (b.booksCount || 0) - (a.booksCount || 0))
    .slice(0, limit)
    .map((cat) => ({
      id: cat.id,
      name: getTaxonomyName(cat, lang),
      slug: getTaxonomySlug(cat, lang),
      booksCount: cat.booksCount || 0,
    }));
}

function PaginationLinks({
  currentPage,
  totalPages,
  baseUrl,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      {currentPage > 1 && (
        <Link href={`${baseUrl}?page=${currentPage - 1}`} className={styles.paginationLink}>
          ←
        </Link>
      )}
      {start > 1 && (
        <Link href={`${baseUrl}?page=1`} className={styles.paginationLink}>
          1
        </Link>
      )}
      {start > 2 && <span className={styles.paginationLink}>...</span>}
      {pages.map((p) => (
        <Link
          key={p}
          href={`${baseUrl}?page=${p}`}
          className={`${styles.paginationLink} ${p === currentPage ? styles.paginationActive : ''}`}
        >
          {p}
        </Link>
      ))}
      {end < totalPages - 1 && <span className={styles.paginationLink}>...</span>}
      {end < totalPages && (
        <Link href={`${baseUrl}?page=${totalPages}`} className={styles.paginationLink}>
          {totalPages}
        </Link>
      )}
      {currentPage < totalPages && (
        <Link href={`${baseUrl}?page=${currentPage + 1}`} className={styles.paginationLink}>
          →
        </Link>
      )}
    </nav>
  );
}

export function TaxonomyDetailPage({
  lang,
  slug,
  taxonomyType,
  data,
  allCategories,
  translations,
  path,
  currentPage,
  totalPages,
  total,
}: TaxonomyDetailPageProps) {
  const category = data?.category ?? null;
  const books = data?.items ?? [];

  const catTranslation = category
    ? ((category.translation as CategoryTranslation | undefined) ??
      category.translations?.find((tr) => tr.language === lang) ??
      null)
    : null;

  const categoryName = catTranslation?.h1 || catTranslation?.name || category?.name || slug;
  const shortDescription = catTranslation?.shortDescription || '';
  const description = catTranslation?.description || category?.description || '';
  const faq = catTranslation?.faq || [];
  const booksCount = category?.booksCount || total;

  const parentCategory = category ? getParentCategory(category, allCategories) : null;
  const children = category ? getChildCategories(category, allCategories) : [];
  const siblings = category ? getSiblingCategories(category, allCategories) : [];

  const parentName = parentCategory ? getTaxonomyName(parentCategory, lang) : '';

  const breadcrumbItems = [
    { label: translations.breadcrumbHome, href: `/${lang}` },
    {
      label: translations.breadcrumbLabel,
      href: `/${lang}/${path}`,
    },
    { label: categoryName },
  ];

  const relatedCategories = category
    ? getRelatedByType(allCategories, category.id, 'category', lang)
    : [];
  const relatedGenres = category ? getRelatedByType(allCategories, category.id, 'genre', lang) : [];
  const relatedCollections = category
    ? getRelatedByType(allCategories, category.id, 'collection', lang)
    : [];

  const faqJsonLd =
    faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item: { question: string; answer: string }) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }
      : null;

  const sidebarContent = (
    <div className={styles.stickySidebar}>
      <h3 className={styles.sidebarTitle}>{translations.browseLabel}</h3>
      <nav className={styles.sidebarNav}>
        <Link href={`/${lang}/catalog`} className={styles.sidebarLink}>
          {translations.allBooksLabel}
        </Link>
        <Link href={`/${lang}/${path}`} className={styles.sidebarLink}>
          {translations.allLabel}
        </Link>
      </nav>

      <h4 className={styles.sidebarSubtitle}>{translations.currentSection}</h4>
      <nav className={styles.sidebarNav}>
        {siblings.map((sibling) => {
          const sibName = getTaxonomyName(sibling, lang);
          const sibSlug = getTaxonomySlug(sibling, lang);
          return (
            <Link
              key={sibling.id}
              href={`/${lang}/${path}/${sibSlug}`}
              className={styles.sidebarLink}
            >
              {sibName}
            </Link>
          );
        })}
      </nav>

      {taxonomyType !== 'category' && (
        <SidebarBlock
          title={translations.relatedCategories}
          items={relatedCategories}
          path="category"
          lang={lang}
        />
      )}
      {taxonomyType !== 'genre' && (
        <SidebarBlock
          title={translations.relatedGenres}
          items={relatedGenres}
          path="genre"
          lang={lang}
        />
      )}
      {taxonomyType !== 'collection' && (
        <SidebarBlock
          title={translations.relatedCollections}
          items={relatedCollections}
          path="collection"
          lang={lang}
        />
      )}
    </div>
  );

  if (!category && !books.length) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.empty}>
            <BookOpen size={48} />
            <p>{translations.noBooks}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <div className={styles.container}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>{sidebarContent}</aside>

          <div className={styles.main}>
            <Breadcrumbs items={breadcrumbItems} />

            <header className={styles.hero}>
              <h1 className={styles.title}>{categoryName}</h1>
              {shortDescription && <p className={styles.shortDescription}>{shortDescription}</p>}
              <p className={styles.count}>
                {translations.booksCount.replace('{count}', String(booksCount))}
              </p>
              {parentCategory && parentName && (
                <Link
                  href={`/${lang}/${path}/${parentCategory.slug}`}
                  className={styles.parentLink}
                >
                  <ChevronRight size={14} className={styles.parentIcon} />
                  {parentName}
                </Link>
              )}
            </header>

            {children.length > 0 && (
              <section className={styles.childrenSection}>
                <div className={styles.chips}>
                  {children.slice(0, 12).map((child) => {
                    const childName = getTaxonomyName(child, lang);
                    const childSlug = getTaxonomySlug(child, lang);
                    return (
                      <Link
                        key={child.id}
                        href={`/${lang}/${path}/${childSlug}`}
                        className={styles.chip}
                      >
                        {childName}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <TaxonomyDetailInteractions
              browseLabel={translations.browseLabel}
              sidebarContent={sidebarContent}
              description={description}
              descriptionSectionTitle={translations.aboutSection.replace('{name}', categoryName)}
              showMoreLabel={translations.showMore}
              showLessLabel={translations.showLess}
            />

            {books.length === 0 ? (
              <div className={styles.empty}>
                <BookOpen size={48} />
                <p>{translations.noBooks}</p>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} size="md" />
                  ))}
                </div>

                <PaginationLinks
                  currentPage={currentPage}
                  totalPages={totalPages}
                  baseUrl={`/${lang}/${path}/${slug}`}
                />
              </>
            )}

            {(relatedGenres.length > 0 ||
              relatedCategories.length > 0 ||
              relatedCollections.length > 0) && (
              <section className={styles.relatedMainSection}>
                <h2 className={styles.sectionTitle}>{translations.exploreMoreLabel}</h2>

                {relatedGenres.length > 0 && (
                  <div className={styles.relatedGroup}>
                    <h3 className={styles.relatedGroupTitle}>{translations.relatedGenres}</h3>
                    <div className={styles.chips}>
                      {relatedGenres.slice(0, 8).map((item) => (
                        <Link
                          key={item.id}
                          href={`/${lang}/genre/${item.slug}`}
                          className={styles.chip}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {relatedCategories.length > 0 && (
                  <div className={styles.relatedGroup}>
                    <h3 className={styles.relatedGroupTitle}>{translations.relatedCategories}</h3>
                    <div className={styles.chips}>
                      {relatedCategories.slice(0, 8).map((item) => (
                        <Link
                          key={item.id}
                          href={`/${lang}/category/${item.slug}`}
                          className={styles.chip}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {relatedCollections.length > 0 && (
                  <div className={styles.relatedGroup}>
                    <h3 className={styles.relatedGroupTitle}>{translations.relatedCollections}</h3>
                    <div className={styles.chips}>
                      {relatedCollections.slice(0, 8).map((item) => (
                        <Link
                          key={item.id}
                          href={`/${lang}/collection/${item.slug}`}
                          className={styles.chip}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* FAQ */}
            {faq.length > 0 && (
              <FaqBlock items={faq} title={translations.faqTitle} className={styles.faqSection} />
            )}

            {/* Bottom links */}
            <section className={styles.bottomLinks}>
              <h2 className={styles.sectionTitle}>{translations.exploreMoreLabel}</h2>
              <div className={styles.bottomLinksList}>
                <Link href={`/${lang}/${path}`} className={styles.bottomLink}>
                  {translations.linkLabel}
                </Link>
                <Link href={`/${lang}/catalog`} className={styles.bottomLink}>
                  {translations.allBooksLink}
                </Link>
                <Link href={`/${lang}/tags`} className={styles.bottomLink}>
                  {translations.tagsLink}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
