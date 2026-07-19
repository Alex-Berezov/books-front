import { getBookCards, getPublicCategories } from '@/api/endpoints/public';
import { CatalogContent } from '@/components/public/catalog/CatalogContent/CatalogContent';
import { buildItemListJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string; sort?: string; type?: string; q?: string }>;
};

const PAGE_SIZE = 24;

const titles: Record<SupportedLang, Record<string, string>> = {
  en: {
    default: 'All Books Catalog - Read & Listen Free | Bibliaris',
    popular: 'Popular Books - Read & Listen Free | Bibliaris',
    new: 'New Releases - Read & Listen Free | Bibliaris',
    audio: 'Audiobooks - Read & Listen Free | Bibliaris',
  },
  es: {
    default: 'Catálogo completo de libros - Leer y escuchar gratis | Bibliaris',
    popular: 'Libros populares - Leer y escuchar gratis | Bibliaris',
    new: 'Novedades - Leer y escuchar gratis | Bibliaris',
    audio: 'Audiolibros - Leer y escuchar gratis | Bibliaris',
  },
  fr: {
    default: 'Catalogue complet de livres - Lire et écouter gratuit | Bibliaris',
    popular: 'Livres populaires - Lire et écouter gratuit | Bibliaris',
    new: 'Nouveautés - Lire et écouter gratuit | Bibliaris',
    audio: 'Livres audio - Lire et écouter gratuit | Bibliaris',
  },
  pt: {
    default: 'Catálogo completo de livros - Ler e ouvir grátis | Bibliaris',
    popular: 'Livros populares - Ler e ouvir grátis | Bibliaris',
    new: 'Lançamentos - Ler e ouvir grátis | Bibliaris',
    audio: 'Audiolivros - Ler e ouvir grátis | Bibliaris',
  },
  ru: {
    default: 'Каталог книг — читать и слушать бесплатно | Bibliaris',
    popular: 'Популярные книги — читать и слушать бесплатно | Bibliaris',
    new: 'Новинки — читать и слушать бесплатно | Bibliaris',
    audio: 'Аудиокниги — читать и слушать бесплатно | Bibliaris',
  },
};

const descriptions: Record<SupportedLang, Record<string, string>> = {
  en: {
    default:
      'Browse our full catalog of books on Bibliaris. Explore classic literature, audiobooks, summaries, popular genres, and new releases.',
    popular:
      'Discover the most popular books on Bibliaris. Top-rated classic literature loved by readers worldwide.',
    new: 'Explore the latest new releases on Bibliaris. Recently added classic literature and audiobooks.',
    audio:
      'Browse our audiobook catalog on Bibliaris. Listen to classic literature with professional narration.',
  },
  es: {
    default:
      'Explora nuestro catálogo completo de libros en Bibliaris. Descubre literatura clásica, audiolibros, resúmenes, géneros populares y novedades.',
    popular:
      'Descubre los libros más populares en Bibliaris. Literatura clásica mejor valorada por lectores de todo el mundo.',
    new: 'Explora las últimas novedades en Bibliaris. Literatura clásica y audiolibros añadidos recientemente.',
    audio:
      'Explora nuestro catálogo de audiolibros en Bibliaris. Escucha literatura clásica con narración profesional.',
  },
  fr: {
    default:
      'Découvrez notre catalogue complet de livres sur Bibliaris. Explorez la littérature classique, les livres audio, les résumés, les genres populaires et les nouveautés.',
    popular:
      'Découvrez les livres les plus populaires sur Bibliaris. Littérature classique la mieux notée par les lecteurs du monde entier.',
    new: 'Explorez les dernières nouveautés sur Bibliaris. Littérature classique et livres audio récemment ajoutés.',
    audio:
      'Explorez notre catalogue de livres audio sur Bibliaris. Écoutez la littérature classique avec une narration professionnelle.',
  },
  pt: {
    default:
      'Explore nosso catálogo completo de livros no Bibliaris. Descubra literatura clássica, audiolibros, resumos, gêneros populares e lançamentos.',
    popular:
      'Descubra os livros mais populares no Bibliaris. Literatura clássica mais bem avaliada por leitores do mundo todo.',
    new: 'Explore os últimos lançamentos no Bibliaris. Literatura clássica e audiolivros adicionados recentemente.',
    audio:
      'Explore nosso catálogo de audiolivros no Bibliaris. Ouça literatura clássica com narração profissional.',
  },
  ru: {
    default:
      'Просмотрите полный каталог книг на Bibliaris. Откройте для себя классическую литературу, аудиокниги, краткие содержания, популярные жанры и новинки.',
    popular:
      'Откройте для себя самые популярные книги на Bibliaris. Классическая литература с высоким рейтингом от читателей со всего мира.',
    new: 'Исследуйте последние новинки на Bibliaris. Недавно добавленная классическая литература и аудиокниги.',
    audio:
      'Просмотрите каталог аудиокниг на Bibliaris. Слушайте классическую литературу в профессиональном исполнении.',
  },
};

function getTitleKey(sort?: string, type?: string, q?: string): string {
  if (q) return 'default';
  if (type === 'audio') return 'audio';
  if (sort === 'popular') return 'popular';
  if (sort === 'new') return 'new';
  return 'default';
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;
  const titleKey = getTitleKey(sParams.sort, sParams.type, sParams.q);

  const title = titles[supportedLang]?.[titleKey] || titles.en[titleKey];
  const description = descriptions[supportedLang]?.[titleKey] || descriptions.en[titleKey];

  const baseMetadata = getPageMetadata(supportedLang, '/catalog', title, description);

  if (sParams.q || sParams.type || sParams.sort) {
    baseMetadata.robots = 'noindex, follow';
  }

  return baseMetadata;
}

export const dynamic = 'force-dynamic';

export default async function CatalogPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;

  const currentPage = Math.max(1, Number(sParams.page) || 1);
  const sort = (sParams.sort as 'popular' | 'new') || undefined;
  const type = (sParams.type as 'audio' | 'text') || undefined;
  const q = sParams.q || undefined;

  const [booksRes, categoriesRes, genresRes] = await Promise.all([
    getBookCards(supportedLang, currentPage, PAGE_SIZE, { sort, type, q }).catch(() => null),
    getPublicCategories(supportedLang, 'category').catch(() => null),
    getPublicCategories(supportedLang, 'genre').catch(() => null),
  ]);

  const books = booksRes?.items ?? [];
  const pagination = booksRes?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };
  const categories = (categoriesRes?.data ?? []).filter((cat) => cat.booksCount > 0);
  const genres = (genresRes?.data ?? []).filter((gen) => gen.booksCount > 0);

  const hasFilters = !!(q || type || sort);
  const siteUrl = getSiteUrl();
  const itemListJsonLd = !hasFilters
    ? buildItemListJsonLd(
        books
          .filter((book) => book.slug && book.title)
          .map((book) => ({
            name: book.title,
            url: `${siteUrl}/${supportedLang}/book/${book.slug}`,
          })),
        `${siteUrl}/${supportedLang}/catalog`
      )
    : null;

  return (
    <>
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <CatalogContent
        lang={supportedLang}
        books={books}
        pagination={pagination}
        categories={categories}
        genres={genres}
        currentSort={sort}
        currentType={type}
        currentQ={q}
        currentPage={currentPage}
      />
    </>
  );
}
