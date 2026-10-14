import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicAuthorBySlug } from '@/api/endpoints/public';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
  authorFallbackMeta,
  authorUrl,
  buildAuthorHreflang,
  buildAuthorPersonJsonLd,
  describeFromBiography,
} from '@/lib/seo/author-page';
import { resolveRetiredSlug } from '@/lib/seo/retired-slug';
import { buildLangUrl } from '@/lib/seo/urls';
import { handleContentFailure, isNotFoundError } from '@/lib/utils/content-failure';
import { buildBreadcrumbJsonLd, serializeJsonLd } from '@/lib/utils/json-ld';
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
  let author: PublicAuthorDetail | null = null;
  // Сколько у автора книг на этом языке — или что выяснить не удалось. Различие
  // принципиально: `200 + noindex` — уверенный ответ, Google по нему страницу
  // выбрасывает, и возвращается она неделями. Отсутствие тега на время сбоя
  // бэкенда не стоит ничего.
  let bookCount: CountResult = { ok: false };
  try {
    author = await getPublicAuthorBySlug(supportedLang, authorSlug);
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
    //
    // С F02-1 — отдельный счёт `booksTotal`, а не длина списка: с F02-3 список станет порцией.
    // Ответ бэкенда до F02-1 поля не несёт — тогда длина списка, как раньше.
    if (author) {
      bookCount = toCountResult(
        typeof author.booksTotal === 'number'
          ? author.booksTotal
          : Array.isArray(author.books)
            ? author.books.length
            : null
      );
    }
  } catch {
    // Fallback if Remote API is not updated yet
  }

  const { title: fallbackTitle, description: fallbackDescription } = authorFallbackMeta(
    supportedLang,
    displayName
  );

  const title = seoDataFromDb?.metaTitle || fallbackTitle;
  // Своё описание → начало биографии (≤ 160) → шаблон (решение арбитра 14.10.2026, F02-1).
  const description =
    seoDataFromDb?.metaDescription ||
    describeFromBiography(author?.biography) ||
    fallbackDescription;
  // Картинка для соцсетей: своя из SEO, иначе портрет автора.
  const ogImageUrl = seoDataFromDb?.ogImageUrl || author?.photoUrl || null;

  const baseMetadata = getPageMetadata(supportedLang, `/author/${authorSlug}`, title, description);
  // hreflang — слаги языков и правило карты сайта, а не пять языков с одним слагом
  // (`buildAlternateLanguages` внутри `getPageMetadata`): у автора слаг свой у каждого языка,
  // и прежний кластер вёл на 404. Нет данных о переводах — блока альтернатив нет вовсе.
  const hreflang = buildAuthorHreflang(author?.alternates);
  baseMetadata.alternates = {
    canonical: baseMetadata.alternates?.canonical,
    ...(hreflang ? { languages: hreflang } : {}),
  };
  if (ogImageUrl) {
    baseMetadata.openGraph = { ...baseMetadata.openGraph, images: [{ url: ogImageUrl }] };
  }

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
      images: ogImageUrl
        ? [
            {
              url: ogImageUrl,
              alt: (seoDataFromDb.ogImageUrl && seoDataFromDb.ogImageAlt) || undefined,
            },
          ]
        : undefined,
    };
    if (seoDataFromDb.twitterCard) {
      baseMetadata.twitter = {
        card: seoDataFromDb.twitterCard as 'summary' | 'summary_large_image',
        title: seoDataFromDb.ogTitle || title,
        description: seoDataFromDb.ogDescription || description,
        images: ogImageUrl ? [ogImageUrl] : undefined,
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
    //
    // Но прежде чем отдать 404 — спросить историю слагов (LEGACY-062). Слаг автора
    // существует только на уровне перевода (базового у Author нет), поэтому запись
    // и резолв идут по языку. Порядок обязателен: попытка отдать живого автора уже
    // провалилась 404-м, и только теперь история имеет право говорить.
    if (isNotFoundError(error)) {
      const retired = await resolveRetiredSlug('author', supportedLang, authorSlug);
      if (retired && retired !== authorSlug) {
        permanentRedirect(`/${supportedLang}/author/${retired}`);
      }
    }
    handleContentFailure(error, notFound);
  }

  // Второй путь к тому же выводу, до сих пор не закрытый ничем: запрос не бросил,
  // но автора нет. Сегодня это недостижимо только потому, что бэкенд честно бросает
  // NotFoundException — то есть контракт держится на честном слове, а не на коде.
  // Без этой ветки вырожденный успешный ответ отрендерил бы страницу с именем,
  // собранным из самого слага, — ровно тот soft-404, против которого написан
  // комментарий выше.
  if (!author) {
    const retired = await resolveRetiredSlug('author', supportedLang, authorSlug);
    if (retired && retired !== authorSlug) {
      permanentRedirect(`/${supportedLang}/author/${retired}`);
    }
    notFound();
  }

  const pageUrl = authorUrl(supportedLang, author.slug);
  const jsonLd = buildAuthorPersonJsonLd(supportedLang, author);

  const dictionary = getDictionary(supportedLang);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: dictionary.breadcrumb.home, url: buildLangUrl(supportedLang) },
      { name: dictionary.breadcrumb.authors, url: buildLangUrl(supportedLang, '/authors') },
      { name: author.name || displayName, url: pageUrl },
    ],
    pageUrl
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
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
