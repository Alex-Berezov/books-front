import { getPublicBooks, getPublicAuthorBySlug } from '@/api/endpoints/public';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, PublicAuthorDetail } from '@/types/api-schema';
import type { Metadata } from 'next';
import AuthorDetailClient from './AuthorDetailClient';

export const revalidate = 300;

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
  let displayName = toTitleCase(searchName);

  let seoDataFromDb: PublicAuthorDetail['seo'] = null;
  try {
    const author = await getPublicAuthorBySlug(supportedLang, authorSlug);
    if (author && author.name) {
      displayName = author.name;
    }
    if (author && author.seo) {
      seoDataFromDb = author.seo;
    }
  } catch {
    // Fallback if Remote API is not updated yet
  }

  let fallbackTitle = '';
  let fallbackDescription = '';

  switch (supportedLang) {
    case 'ru':
      fallbackTitle = `${displayName} — Книги, биография и аудиокниги | Bibliaris`;
      fallbackDescription = `Откройте для себя книги, биографию, цитаты и классические аудиокниги автора ${displayName} на Bibliaris. Читайте и слушайте онлайн бесплатно.`;
      break;
    case 'es':
      fallbackTitle = `${displayName} - Libros, biografía y audiolibros | Bibliaris`;
      fallbackDescription = `Explora libros, biografía, frases y audiolibros clásicos de ${displayName} en Bibliaris. Lee y escucha en línea gratis.`;
      break;
    case 'pt':
      fallbackTitle = `${displayName} - Livros, biografia e audiolivros | Bibliaris`;
      fallbackDescription = `Explore livros, biografia, frases e audiolivros clássicos de ${displayName} no Bibliaris. Leia e ouça online gratuitamente.`;
      break;
    case 'fr':
      fallbackTitle = `${displayName} - Livres, biographie et livres audio | Bibliaris`;
      fallbackDescription = `Découvrez les livres, la biographie, les citations et les livres audio classiques de ${displayName} sur Bibliaris. Lisez et écoutez gratuitement en ligne.`;
      break;
    case 'en':
    default:
      fallbackTitle = `${displayName} Books, Biography & Audiobooks | Bibliaris`;
      fallbackDescription = `Explore books, biography, quotes, and classic audiobooks by ${displayName} on Bibliaris. Read and listen online for free.`;
      break;
  }

  const title = seoDataFromDb?.metaTitle || fallbackTitle;
  const description = seoDataFromDb?.metaDescription || fallbackDescription;

  const baseMetadata = getPageMetadata(supportedLang, `/author/${authorSlug}`, title, description);

  if (seoDataFromDb) {
    if (seoDataFromDb.canonicalUrl) {
      baseMetadata.alternates = {
        ...baseMetadata.alternates,
        canonical: seoDataFromDb.canonicalUrl,
      };
    }
    if (seoDataFromDb.robots) {
      baseMetadata.robots = seoDataFromDb.robots;
    }
    baseMetadata.openGraph = {
      title: seoDataFromDb.ogTitle || title,
      description: seoDataFromDb.ogDescription || description,
      url: baseMetadata.openGraph?.url || undefined,
      type: 'website',
      images: seoDataFromDb.ogImageUrl
        ? [
            {
              url: seoDataFromDb.ogImageUrl,
              alt: seoDataFromDb.ogImageAlt || undefined,
            },
          ]
        : undefined,
    };
    if (seoDataFromDb.twitterCard) {
      baseMetadata.twitter = {
        card: seoDataFromDb.twitterCard as 'summary' | 'summary_large_image',
        title: seoDataFromDb.ogTitle || title,
        description: seoDataFromDb.ogDescription || description,
        images: seoDataFromDb.ogImageUrl ? [seoDataFromDb.ogImageUrl] : undefined,
      };
    }
  }

  return baseMetadata;
}

export default async function AuthorDetailPage({ params }: Props) {
  const { lang, authorSlug } = await params;
  const supportedLang = lang as SupportedLang;
  const searchName = decodeAuthorSlug(authorSlug ?? '');
  const displayName = toTitleCase(searchName);

  let author: PublicAuthorDetail | null = null;
  let initialBooks: BookOverview[] = [];
  let isFallback = false;

  try {
    author = await getPublicAuthorBySlug(supportedLang, authorSlug);
  } catch (error) {
    console.error('Failed to fetch author via getPublicAuthorBySlug, using fallback:', error);
    isFallback = true;
    try {
      const booksRes = await getPublicBooks(supportedLang, { limit: 100 });
      initialBooks = booksRes.data || [];
    } catch (err) {
      console.error('Error fetching author books on server:', err);
    }
  }

  // Construct JSON-LD Person schema if author details are available
  const jsonLd =
    author && (author.birthDate || author.deathDate || author.wikidataUrl)
      ? {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: author.name,
          birthDate: author.birthDate || undefined,
          deathDate: author.deathDate || undefined,
          sameAs: [author.wikidataUrl, author.wikipediaUrl].filter(Boolean),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <AuthorDetailClient
        lang={lang}
        authorSlug={authorSlug}
        displayName={author?.name || displayName}
        authorData={author}
        isFallback={isFallback}
        initialBooks={initialBooks}
      />
    </>
  );
}
