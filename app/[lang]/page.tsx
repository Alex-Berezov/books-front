import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
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

  return <HomeClient lang={lang} />;
}
