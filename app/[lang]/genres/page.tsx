import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import GenresClient from './GenresClient';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const dict = getDictionary(lang);
  const title = `${dict.genres?.title || 'Genres'} - Bibliaris`;
  const description = dict.genres?.subtitle || '';

  return getPageMetadata(lang, '/genres', title, description);
}

export default async function GenresPage({ params }: Props) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;

  return <GenresClient lang={lang} />;
}
