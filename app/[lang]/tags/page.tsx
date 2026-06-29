import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import TagsClient from './TagsClient';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const dict = getDictionary(lang);
  const title = `${dict.tags?.title || 'Literary Tags'} - Bibliaris`;
  const description = dict.tags?.subtitle || '';

  return getPageMetadata(lang, '/tags', title, description);
}

export default async function TagsPage({ params }: Props) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;

  return <TagsClient lang={lang} />;
}
