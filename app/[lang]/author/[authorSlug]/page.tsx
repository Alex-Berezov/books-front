import { getPublicBooks } from '@/api/endpoints/public';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
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

  let title = '';
  let description = '';

  switch (supportedLang) {
    case 'ru':
      title = `${displayName} — Книги, биография и цитаты | Bibliaris`;
      description = `Откройте для себя книги, биографию, цитаты и классические произведения автора ${displayName} на Bibliaris. Читайте и слушайте онлайн бесплатно.`;
      break;
    case 'es':
      title = `${displayName} - Libros, biografía y frases | Bibliaris`;
      description = `Explora libros, biografía, frases & obras clásicas de ${displayName} en Bibliaris. Lee y escucha en línea gratis.`;
      break;
    case 'pt':
      title = `${displayName} - Livros, biografia e frases | Bibliaris`;
      description = `Explore livros, biografia, frases e obras clásicas de ${displayName} no Bibliaris. Leia e ouça online gratuitamente.`;
      break;
    case 'fr':
      title = `${displayName} - Livres, biographie et citations | Bibliaris`;
      description = `Découvrez les livres, la biographie, les citations et les œuvres classiques de ${displayName} sur Bibliaris. Lisez et écoutez gratuitement en ligne.`;
      break;
    case 'en':
    default:
      title = `${displayName} - Books, Biography & Quotes | Bibliaris`;
      description = `Explore books, biography, quotes, and classic works by ${displayName} on Bibliaris. Read and listen online for free.`;
      break;
  }

  return getPageMetadata(supportedLang, `/author/${authorSlug}`, title, description);
}

export default async function AuthorDetailPage({ params }: Props) {
  const { lang, authorSlug } = await params;
  const supportedLang = lang as SupportedLang;
  const searchName = decodeAuthorSlug(authorSlug ?? '');
  const displayName = toTitleCase(searchName);

  let initialBooks: BookOverview[] = [];
  try {
    const booksRes = await getPublicBooks(supportedLang, { limit: 100 });
    initialBooks = booksRes.data || [];
  } catch (error) {
    console.error('Error fetching author books on server:', error);
  }

  return (
    <AuthorDetailClient
      lang={lang}
      authorSlug={authorSlug}
      displayName={displayName}
      initialBooks={initialBooks}
    />
  );
}
