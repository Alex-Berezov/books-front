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
    const book = await getBookOverview(supportedLang, slug);
    const seo = await resolveSeo(supportedLang, 'book', book.id);

    return {
      title: seo.title || book.title,
      description: seo.description || book.description,
      keywords: seo.keywords || [],
      alternates: {
        canonical: seo.canonicalUrl || undefined,
        languages: seo.alternates || {},
      },
      openGraph: seo.ogImage
        ? {
            title: seo.title || book.title,
            description: seo.description || book.description,
            images: [{ url: seo.ogImage }],
          }
        : undefined,
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
  try {
    initialBook = await getBookOverview(supportedLang, slug);
  } catch (error) {
    console.error('Error loading book overview on server:', error);
  }

  return <BookDetailClient slug={slug} lang={lang} initialBook={initialBook} />;
}
