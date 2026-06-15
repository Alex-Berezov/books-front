import { getCategories } from '@/api/endpoints/admin/categories';
import { getPublicBooks } from '@/api/endpoints/public';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, Category } from '@/types/api-schema';
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

  try {
    const [booksRes, catsRes] = await Promise.all([
      getPublicBooks(supportedLang, { limit: 100 }),
      getCategories({ limit: 50 }),
    ]);
    initialBooks = booksRes.data || [];
    initialCategories = catsRes.data || [];
  } catch (error) {
    console.error('Error fetching home page data on server:', error);
  }

  return (
    <HomeClient lang={lang} initialBooks={initialBooks} initialCategories={initialCategories} />
  );
}
