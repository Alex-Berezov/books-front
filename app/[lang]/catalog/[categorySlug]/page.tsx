import { resolveSeo } from '@/api/endpoints/public';
import { CatalogTemplate } from '@/components/public/catalog/CatalogTemplate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string; categorySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, categorySlug } = await params;
  const supportedLang = lang as SupportedLang;

  try {
    const seo = await resolveSeo(supportedLang, 'category', categorySlug);

    const alternatesLanguages: Record<string, string> = {};
    (seo.hreflangs || seo.hreflang)?.forEach((item) => {
      if (item.hreflang) {
        alternatesLanguages[item.hreflang] = item.href;
      }
    });

    return {
      title: seo.meta.title,
      description: seo.meta.description || undefined,
      robots: seo.meta.robots || undefined,
      alternates: {
        canonical: seo.meta.canonicalUrl || undefined,
        languages: alternatesLanguages,
      },
      openGraph: {
        title: seo.openGraph.title,
        description: seo.openGraph.description || undefined,
        type: 'website',
        url: seo.openGraph.url,
        images: seo.openGraph.image
          ? [
              {
                url: seo.openGraph.image.url,
                alt: seo.openGraph.image.alt,
              },
            ]
          : undefined,
      },
      twitter: {
        card: (seo.twitter.card as 'summary' | 'summary_large_image') || 'summary',
        site: seo.twitter.site || undefined,
        title: seo.twitter.title || undefined,
        description: seo.twitter.description || undefined,
        images: seo.twitter.image ? [seo.twitter.image] : undefined,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for category:', error);
    return {
      title: 'Catalog - Bibliaris',
    };
  }
}

export default async function CategoryCatalogPage({ params }: Props) {
  const { lang, categorySlug } = await params;
  const supportedLang = lang as SupportedLang;

  let seoData;
  try {
    seoData = await resolveSeo(supportedLang, 'category', categorySlug);
  } catch (error) {
    console.error('Error loading SEO for category catalog on server:', error);
  }

  return (
    <>
      {seoData?.schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData.schema) }}
        />
      )}
      <CatalogTemplate lang={supportedLang} categorySlug={categorySlug} />
    </>
  );
}
