import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicAuthorBySlug } from '@/api/endpoints/public';
import { AuthorBooks } from '@/components/public/author/AuthorBooks/AuthorBooks';
import { AuthorFacts } from '@/components/public/author/AuthorFacts/AuthorFacts';
import { AuthorHero } from '@/components/public/author/AuthorHero/AuthorHero';
import { AuthorPageLower } from '@/components/public/author/AuthorPageLower/AuthorPageLower';
import { AuthorStartHere } from '@/components/public/author/AuthorStartHere/AuthorStartHere';
import { authorsBasePath } from '@/components/public/authors/authors-href';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
  authorFallbackMeta,
  authorNameFromSlug,
  buildAuthorHreflang,
  buildAuthorPageGraph,
  describeAuthor,
} from '@/lib/seo/author-page';
import { resolveRetiredSlug } from '@/lib/seo/retired-slug';
import { handleContentFailure, isNotFoundError } from '@/lib/utils/content-failure';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import { buildRobotsByCount, toCountResult } from '@/lib/utils/seo-indexing';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CountResult } from '@/lib/utils/seo-indexing';
import type { PublicAuthorDetail } from '@/types/api-schema';
import type { Metadata } from 'next';
import styles from './author.module.scss';

export const revalidate = 300;

type Props = {
  params: Promise<{ lang: string; authorSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, authorSlug } = await params;
  const supportedLang = lang as SupportedLang;
  let displayName = authorNameFromSlug(authorSlug ?? '');

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
  // Своё описание → `tagline` (F02-3) → начало биографии (≤ 160) → шаблон (`product.md` §18).
  const description = (author && describeAuthor(author)) || fallbackDescription;
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

  let author: PublicAuthorDetail | null = null;

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

  const dictionary = getDictionary(supportedLang);
  // Один `@graph`: WebPage → Person, Person, книги, крошки (`tech.md` F02, §7). `FAQPage` —
  // отдельным блоком `FaqBlock` (решение арбитра 15.10.2026, `F02 | F02-3`, Р5).
  const jsonLd = buildAuthorPageGraph(supportedLang, author, {
    home: dictionary.breadcrumb.home,
    authors: dictionary.breadcrumb.authors,
  });

  // Порядок блоков — `product.md` F02, §2. Каждый блок сам не выводится без данных. Кнопки
  // «Назад» нет: путь назад дают видимые крошки (решение арбитра 15.10.2026, `F02 | F02-3`, Р4).
  return (
    <div className={styles.authorPage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className={styles.container}>
        <Breadcrumbs
          items={[
            { label: dictionary.breadcrumb.home, href: `/${supportedLang}` },
            { label: dictionary.breadcrumb.authors, href: authorsBasePath(supportedLang, null) },
            { label: author.name },
          ]}
          emitJsonLd={false}
        />
        <div className={styles.top}>
          <AuthorHero lang={supportedLang} author={author} />
          <AuthorFacts lang={supportedLang} author={author} />
        </div>
        <AuthorStartHere lang={supportedLang} items={author.startHere} />
        <AuthorBooks lang={supportedLang} author={author} />
        <AuthorPageLower lang={supportedLang} author={author} />
      </div>
    </div>
  );
}
