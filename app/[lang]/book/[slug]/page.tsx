import { permanentRedirect } from 'next/navigation';
import { getBookOverview, resolveSeo } from '@/api/endpoints/public';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import BookDetailClient from './BookDetailClient';

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  try {
    const seo = await resolveSeo(supportedLang, 'book', slug);

    const alternatesLanguages: Record<string, string> = {};
    seo.hreflang?.forEach((item) => {
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
        type: 'book',
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
    console.error('Error generating metadata for book:', error);
    return {
      title: 'Book Details - Bibliaris',
    };
  }
}

export default async function BookDetailPage({ params }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  let initialBook;
  let seoData;
  try {
    initialBook = await getBookOverview(supportedLang, slug);
    seoData = await resolveSeo(supportedLang, 'book', slug);
  } catch (error) {
    console.error('Error loading book overview or SEO on server:', error);
  }

  // Redirect to correct localized slug if requested slug is outdated/incorrect
  if (initialBook && initialBook.slug && initialBook.slug !== slug) {
    permanentRedirect(`/${lang}/book/${initialBook.slug}`);
  }

  return (
    <>
      {seoData?.schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData.schema) }}
        />
      )}
      <BookDetailClient slug={slug} lang={lang} initialBook={initialBook} />
    </>
  );
}
