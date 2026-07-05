import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import CollectionsClient from './CollectionsClient';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;
  const dict = getDictionary(lang);
  const title = `${dict.collections?.title || 'Collections'} - Bibliaris`;
  const description = dict.collections?.subtitle || '';
  return getPageMetadata(lang, '/collections', title, description);
}

export default async function CollectionsPage({ params }: Props) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;
  return <CollectionsClient lang={lang} />;
}
