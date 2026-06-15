import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import AuthorDetailClient from './AuthorDetailClient';

type Props = {
  params: Promise<{ lang: string; authorSlug: string }>;
};

function decodeAuthorSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/-/g, ' ');
  } catch {
    return slug.replace(/-/g, ' ');
  }
}

function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, authorSlug } = await params;
  const supportedLang = lang as SupportedLang;
  const searchName = decodeAuthorSlug(authorSlug ?? '');
  const displayName = toTitleCase(searchName);

  const title = `Books by ${displayName} - Bibliaris`;
  const description = `Browse and read books written by ${displayName} on Bibliaris. Discover translation versions, audiobooks, and track your reading progress.`;

  return getPageMetadata(supportedLang, `/author/${authorSlug}`, title, description);
}

export default async function AuthorDetailPage({ params }: Props) {
  const { lang, authorSlug } = await params;
  const searchName = decodeAuthorSlug(authorSlug ?? '');
  const displayName = toTitleCase(searchName);

  return <AuthorDetailClient lang={lang} authorSlug={authorSlug} displayName={displayName} />;
}
