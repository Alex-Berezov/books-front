import { notFound } from 'next/navigation';
import { getPublicAuthorBySlug } from '@/api/endpoints/public';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { handleContentFailure } from '@/lib/utils/content-failure';
import { buildBreadcrumbJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import { buildRobotsByCount, toCountResult } from '@/lib/utils/seo-indexing';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CountResult } from '@/lib/utils/seo-indexing';
import type { BookCardModel, PublicAuthorDetail } from '@/types/api-schema';
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
  // Сколько у автора книг на этом языке — или что выяснить не удалось. Различие
  // принципиально: `200 + noindex` — уверенный ответ, Google по нему страницу
  // выбрасывает, и возвращается она неделями. Отсутствие тега на время сбоя
  // бэкенда не стоит ничего.
  let bookCount: CountResult = { ok: false };
  try {
    const author = await getPublicAuthorBySlug(supportedLang, authorSlug);
    if (author && author.name) {
      displayName = author.name;
    }
    if (author && author.seo) {
      seoDataFromDb = author.seo;
    }
    // Берётся поштучный ответ детального эндпоинта, а не `booksCount` из списка.
    // Он честен давно (fallback по имени работает здесь с самого начала), тогда
    // как батчевый счётчик починен только 09.08.2026 — и фронт выкатывается
    // отдельно от бэкенда. Опираться здесь на список значило бы в окне между
    // двумя выкатами закрыть noindex'ом все страницы авторов разом.
    if (author) {
      bookCount = toCountResult(Array.isArray(author.books) ? author.books.length : null);
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

  // 🔴 Единственное место, где счётчик что-то решает, и он умеет только **сужать**.
  //
  // Автор без опубликованных книг на этом языке — тонкая страница: имя, иногда
  // биография и ничего больше. Такие страницы до 09.08.2026 отдавали
  // `index, follow` наравне с наполненными, потому что авторы вообще не входили
  // в контур «ссылка = sitemap = robots», выстроенный по таксономиям.
  //
  // Неизвестность нулём не считается: при `!ok` вердикт бэкенда остаётся как был.
  // И редакторский `noindex` из SEO-бандла тоже остаётся — открыть страницу
  // счётчик не может, только закрыть.
  const countVerdict = buildRobotsByCount(bookCount, false);
  if (countVerdict && !countVerdict.index) {
    baseMetadata.robots = { index: false, follow: true };
  }

  return baseMetadata;
}

export default async function AuthorDetailPage({ params }: Props) {
  const { lang, authorSlug } = await params;
  const supportedLang = lang as SupportedLang;
  const searchName = decodeAuthorSlug(authorSlug ?? '');
  const displayName = toTitleCase(searchName);

  let author: PublicAuthorDetail | null = null;
  const initialBooks: BookCardModel[] = [];

  try {
    author = await getPublicAuthorBySlug(supportedLang, authorSlug);
  } catch (error) {
    // A slug that resolves to no author is a 404, full stop. Rendering a page
    // built out of the slug itself made every invented, mistyped or deliberately
    // generated slug answer 200 with a plausible title — an unbounded space of
    // soft-404s that anyone outside could fill by publishing links. It also
    // produced a second live URL per author on non-English pages, because the
    // author sitemap lists base slugs: /ru/author/sun-tzu rendered this fallback
    // while the real page lives at /ru/author/sun-czy.
    //
    // An outage is different and must not be turned into a 404 — handled by
    // handleContentFailure, which rethrows anything that is not a 404.
    handleContentFailure(error, notFound);
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

  const siteUrl = getSiteUrl();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: getDictionary(supportedLang).breadcrumb.home, url: `${siteUrl}/${supportedLang}` },
      {
        name: author?.name || displayName,
        url: `${siteUrl}/${supportedLang}/author/${authorSlug}`,
      },
    ],
    `${siteUrl}/${supportedLang}/author/${authorSlug}`
  );

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <AuthorDetailClient
        lang={lang}
        authorSlug={authorSlug}
        displayName={author?.name || displayName}
        authorData={author}
        isFallback={false}
        initialBooks={initialBooks}
      />
    </>
  );
}
