import { getCategories } from '@/api/endpoints/admin/categories';
import { getTags } from '@/api/endpoints/admin/tags';
import { getPage, getPublicBooks } from '@/api/endpoints/public';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, Category, Tag } from '@/types/api-schema';
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
  let initialPage: PageResponse | null = null;

  try {
    const [booksRes, catsRes, genresRes, colsRes, tagsRes, pageRes] = await Promise.all([
      getPublicBooks(supportedLang, { limit: 100 }),
      getCategories({ limit: 50 }),
      getCategories({ type: 'genre', limit: 50 }),
      getCategories({ type: 'collection', limit: 50 }),
      getTags({ limit: 50 }),
      getPage(supportedLang, 'homepage-index').catch(() => null as PageResponse | null),
    ]);
    initialBooks = booksRes.data || [];
    initialCategories = catsRes.data || [];
    initialGenres = genresRes.data || [];
    initialCollections = colsRes.data || [];
    initialTags = tagsRes.data || [];
    initialPage = pageRes;
  } catch (error) {
    console.error('Error fetching home page data on server:', error);
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
      initialPage={initialPage}
      audiobooksCount={audiobooksCount}
    />
  );
}
