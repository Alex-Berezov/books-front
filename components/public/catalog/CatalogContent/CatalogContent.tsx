import { SlidersHorizontal, Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { BookCard } from '@/components/public/books/BookCard';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { CategoryListItem } from '@/api/endpoints/public';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookCardModel } from '@/types/api-schema';
import styles from './CatalogContent.module.scss';

interface CatalogContentProps {
  lang: SupportedLang;
  books: BookCardModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  categories: CategoryListItem[];
  genres: CategoryListItem[];
  currentSort?: string;
  currentType?: string;
  currentQ?: string;
  currentPage: number;
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.append(key, value);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

function getActiveLabel(
  dict: Record<string, unknown>,
  currentSort?: string,
  currentType?: string,
  currentQ?: string
): string {
  const catalog = dict.catalog as Record<string, string> | undefined;
  if (currentQ) return `"${currentQ}"`;
  if (currentType === 'audio') return catalog?.audiobooksOnly || 'Audiobooks';
  if (currentSort === 'new') return catalog?.newReleases || 'New Releases';
  if (currentSort === 'popular') return catalog?.popular || 'Popular';
  return catalog?.allBooks || 'All Books';
}

export function CatalogContent({
  lang,
  books,
  pagination,
  categories,
  genres,
  currentSort,
  currentType,
  currentQ,
  currentPage,
}: CatalogContentProps) {
  const dict = getDictionary(lang);
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = dict;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  const isFiltered = !!currentSort || !!currentType || !!currentQ;

  return (
    <div className={styles.catalogPage}>
      <div className={styles.container}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.stickySidebar}>
              <h3 className={styles.sidebarTitle}>
                <SlidersHorizontal size={16} /> {t('catalog.sidebarTitle')}
              </h3>
              <div className={styles.genresList}>
                <Link
                  href={`/${lang}/catalog`}
                  className={`${styles.genreLink} ${!isFiltered ? styles.activeGenre : ''}`}
                >
                  {t('catalog.allBooks')}
                </Link>

                {categories.length > 0 && (
                  <>
                    <h4 className={styles.sidebarSubtitle}>{t('categories.title')}</h4>
                    {categories.map((cat) => {
                      const trans =
                        cat.translations?.find((t) => t.language === lang) || cat.translations?.[0];
                      const name = trans?.name || cat.name;
                      const slug = trans?.slug || cat.slug;
                      return (
                        <Link
                          key={cat.id}
                          href={`/${lang}/category/${slug}`}
                          className={styles.genreLink}
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
                      const name = trans?.name || gen.name;
                      const slug = trans?.slug || gen.slug;
                      return (
                        <Link
                          key={gen.id}
                          href={`/${lang}/genre/${slug}`}
                          className={styles.genreLink}
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

          <div className={styles.content}>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.title}>
                  {getActiveLabel(dict, currentSort, currentType, currentQ)}
                </h1>
                <p className={styles.count}>
                  {pagination.total} {t('catalog.booksFound')}
                </p>
              </div>
              <div className={styles.toolbar}>
                <form method="GET" action={`/${lang}/catalog`} className={styles.searchForm}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    name="q"
                    defaultValue={currentQ || ''}
                    placeholder="Search by title or author..."
                    className={styles.searchInput}
                    aria-label="Search books"
                  />
                </form>
              </div>
            </div>

            <div className={styles.sortRow}>
              <Link
                href={`/${lang}/catalog`}
                className={`${styles.sortLink} ${!currentSort && !currentType && !currentQ ? styles.activeSort : ''}`}
              >
                {t('catalog.allBooks')}
              </Link>
              <Link
                href={`/${lang}/popular-books`}
                className={`${styles.sortLink} ${currentSort === 'popular' ? styles.activeSort : ''}`}
              >
                {t('catalog.popular')}
              </Link>
              <Link
                href={`/${lang}/new-releases`}
                className={`${styles.sortLink} ${currentSort === 'new' ? styles.activeSort : ''}`}
              >
                {t('catalog.newReleases')}
              </Link>
              <Link
                href={`/${lang}/audiobooks`}
                className={`${styles.sortLink} ${currentType === 'audio' ? styles.activeSort : ''}`}
              >
                {t('header.audiobooks')}
              </Link>
            </div>

            {isFiltered && (
              <div className={styles.activeFilters}>
                {currentSort && (
                  <span className={styles.filterBadge}>
                    {currentSort === 'popular' ? t('catalog.popular') : t('catalog.newReleases')}
                  </span>
                )}
                {currentType === 'audio' && (
                  <span className={styles.filterBadge}>{t('catalog.audiobooksOnly')}</span>
                )}
                {currentQ && <span className={styles.filterBadge}>&ldquo;{currentQ}&rdquo;</span>}
                <Link href={`/${lang}/catalog`} className={styles.clearLink}>
                  {t('catalog.clearFilters')}
                </Link>
              </div>
            )}

            {books.length === 0 ? (
              <div className={styles.empty}>
                <Filter className={styles.emptyIcon} size={48} />
                <p className={styles.emptyText}>{t('catalog.noBooksFound')}</p>
                <Link href={`/${lang}/catalog`} className={styles.clearBtn}>
                  {t('catalog.clearFilters')}
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {books.map((book, index) => (
                    <BookCard key={book.id} book={book} size="md" priority={index < 2} />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div className={styles.pagination}>
                    {currentPage > 1 && (
                      <Link
                        href={`/${lang}/catalog${buildQueryString({
                          sort: currentSort,
                          type: currentType,
                          q: currentQ,
                          page: String(currentPage - 1),
                        })}`}
                        className={styles.pageLink}
                      >
                        Previous
                      </Link>
                    )}
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          Math.abs(p - currentPage) <= 2 || p === 1 || p === pagination.totalPages
                      )
                      .map((p, idx, arr) => (
                        <span key={p} className={styles.pageGroup}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className={styles.pageEllipsis}>&hellip;</span>
                          )}
                          {p === currentPage ? (
                            <span className={`${styles.pageLink} ${styles.pageActive}`}>{p}</span>
                          ) : (
                            <Link
                              href={`/${lang}/catalog${buildQueryString({
                                sort: currentSort,
                                type: currentType,
                                q: currentQ,
                                page: p === 1 ? undefined : String(p),
                              })}`}
                              className={styles.pageLink}
                            >
                              {p}
                            </Link>
                          )}
                        </span>
                      ))}
                    {currentPage < pagination.totalPages && (
                      <Link
                        href={`/${lang}/catalog${buildQueryString({
                          sort: currentSort,
                          type: currentType,
                          q: currentQ,
                          page: String(currentPage + 1),
                        })}`}
                        className={styles.pageLink}
                      >
                        Next
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
