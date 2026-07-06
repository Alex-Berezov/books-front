import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import TagDetailClient from './TagDetailClient';

type Props = {
  params: Promise<{ lang: string; tagSlug: string }> | { lang: string; tagSlug: string };
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;
  const tagSlug = resolvedParams.tagSlug;

  // Try to resolve SEO data from backend
  try {
    const { resolveSeo } = await import('@/api/endpoints/public');
    const seo = await resolveSeo(lang, 'tag', tagSlug);

    const alternatesLanguages: Record<string, string> = {};
    (seo.hreflangs || seo.hreflang)?.forEach((item) => {
      if (item.hreflang) {
        alternatesLanguages[item.hreflang] = item.href;
      }
    });

    return {
      title: seo.meta.title || `${tagSlug} - Bibliaris`,
      description: seo.meta.description || undefined,
      robots: seo.meta.robots || 'index, follow',
      alternates: {
        canonical: seo.meta.canonicalUrl || undefined,
        languages: alternatesLanguages,
      },
      openGraph: {
        title: seo.openGraph.title || seo.meta.title || `${tagSlug} - Bibliaris`,
        description: seo.openGraph.description || seo.meta.description || undefined,
        type: 'website',
        url: seo.openGraph.url || undefined,
      },
    };
  } catch (error) {
    console.error('Error resolving SEO for tag:', error);
    const dict = getDictionary(lang);
    const title = `${tagSlug} - ${dict.tags?.title || 'Tags'} | Bibliaris`;
    return getPageMetadata(lang, `/tag/${tagSlug}`, title, '');
  }
}

export default async function TagDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const { lang, tagSlug } = resolvedParams;

  return <TagDetailClient lang={lang} tagSlug={tagSlug} />;
}
