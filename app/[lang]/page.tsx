import { getCategories } from '@/api/endpoints/admin/categories';
import { getTags } from '@/api/endpoints/admin/tags';
import {
  getCategoryBookCards,
  getBookCards,
  getPage,
  getPublicAuthors,
  getTagBookCards,
} from '@/api/endpoints/public';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  AuthorListItem,
  BookCardModel,
  BookCollection,
  BookCollectionData,
  Category,
  Tag,
} from '@/types/api-schema';
import type { PageResponse } from '@/types/api-schema';
import type { Metadata } from 'next';
import HomeClient from './HomeClient';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export const revalidate = 300;

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

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

  let initialBooks: BookCardModel[] = [];
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
        getBookCards(supportedLang, 1, 30),
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
    initialBooks = booksRes.items || [];
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
                return getTagBookCards(supportedLang, tax.slug, 1, 3).catch(() => null);
              return getCategoryBookCards(supportedLang, tax.slug, 1, 3).catch(() => null);
            })
          );
          const seen = new Set<string>();
          const books = results
            .filter((r): r is NonNullable<typeof r> => r !== null)
            .flatMap((r) => r.items || [])
            .filter((b) => {
              if (seen.has(b.id)) return false;
              seen.add(b.id);
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

  // BookCardModel already filters to the requested language on the backend;
  // all items are published in this language. hasAudio is provided on the DTO.
  const audiobooksCount = initialBooks.filter((book) => book.hasAudio === true).length;

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
