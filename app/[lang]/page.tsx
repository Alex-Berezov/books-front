import { getCategories } from '@/api/endpoints/admin/categories';
import { getTags } from '@/api/endpoints/admin/tags';
import {
  getCategoryBooks,
  getPage,
  getPublicAuthors,
  getPublicBooks,
  getTagBooks,
} from '@/api/endpoints/public';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  AuthorListItem,
  BookCollection,
  BookCollectionData,
  BookOverview,
  Category,
  Tag,
} from '@/types/api-schema';
import type { PageResponse } from '@/types/api-schema';
import type { Metadata } from 'next';
import HomeClient from './HomeClient';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const dict = getDictionary(lang);
  const title = dict.home?.title || 'Bibliaris';
  const description = dict.home?.subtitle || '';

  return getPageMetadata(lang, '', title, description);
}

export default async function PublicLangPage({ params }: Props) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;
  const supportedLang = lang as SupportedLang;

  let initialBooks: BookOverview[] = [];
  let initialCategories: Category[] = [];
  let initialGenres: Category[] = [];
  let initialCollections: Category[] = [];
  let initialTags: Tag[] = [];
  let initialAuthors: AuthorListItem[] = [];
  let initialPage: PageResponse | null = null;
  let initialCollectionBooks: BookCollectionData[] = [];

  try {
    const [booksRes, catsRes, genresRes, colsRes, tagsRes, authorsRes, pageRes] = await Promise.all(
      [
        getPublicBooks(supportedLang, { limit: 100 }),
        getCategories({ limit: 50 }),
        getCategories({ type: 'genre', limit: 50 }),
        getCategories({ type: 'collection', limit: 50 }),
        getTags({ limit: 50 }),
        getPublicAuthors(supportedLang, { limit: 50 }).catch(() => ({
          data: [] as AuthorListItem[],
          meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
        })),
        getPage(supportedLang, 'homepage-index').catch(() => null as PageResponse | null),
      ]
    );
    initialBooks = booksRes.data || [];
    initialCategories = catsRes.data || [];
    initialGenres = genresRes.data || [];
    initialCollections = colsRes.data || [];
    initialTags = tagsRes.data || [];
    initialAuthors = authorsRes.data || [];
    initialPage = pageRes;
  } catch (error) {
    console.error('Error fetching home page data on server:', error);
  }

  // Fetch books for each curated collection defined in the page sections
  if (initialPage?.sections) {
    const collections = (
      initialPage.sections.bookCollections as BookCollection[] | undefined
    )?.filter((c) => c.title && c.taxonomies?.length > 0);
    if (collections?.length) {
      const raw = await Promise.all(
        collections.map(async (col) => {
          const results = await Promise.all(
            col.taxonomies.map((tax) => {
              if (tax.type === 'tag')
                return getTagBooks(supportedLang, tax.slug, 1, 3).catch(() => null);
              return getCategoryBooks(supportedLang, tax.slug, 1, 3).catch(() => null);
            })
          );
          const seen = new Set<string>();
          const books = (
            results
              .filter((r): r is NonNullable<typeof r> => r !== null)
              .flatMap((r) => (r as { data: BookOverview[] }).data || []) as BookOverview[]
          ).filter((b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const key = (b as any).bookId || b.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return {
            title: col.title,
            description: col.description,
            position: col.position,
            books,
          } as BookCollectionData;
        })
      );
      initialCollectionBooks = raw.filter((c) => c.books.length > 0);
    }
  }

  const publishedBooks = initialBooks.filter((book) =>
    book.versions?.some((v) => v.language === supportedLang && v.status === 'published')
  );
  const audiobooksCount = publishedBooks.filter((book) => book.hasAudio === true).length;

  return (
    <HomeClient
      lang={lang}
      initialBooks={initialBooks}
      initialCategories={initialCategories}
      initialGenres={initialGenres}
      initialCollections={initialCollections}
      initialTags={initialTags}
      initialAuthors={initialAuthors}
      initialPage={initialPage}
      initialCollectionBooks={initialCollectionBooks}
      audiobooksCount={audiobooksCount}
    />
  );
}
