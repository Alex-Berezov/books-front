import {
  AuthorsHub,
  applyAuthorsRobots,
  countAuthors,
  loadAuthorLetters,
  loadAuthors,
  parseAuthorsQuery,
  resolveAuthorsRobots,
} from '@/components/public/authors';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { fetchPageBySystemKey } from '@/lib/utils/fetch-page';
import { buildBreadcrumbJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { logError } from '@/lib/utils/log-error';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export const revalidate = 300;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;
  const query = parseAuthorsQuery((await searchParams) ?? {}, null);

  // Оба запроса независимы, и `query.search` известен до них обоих: под поиском
  // счётчик не нужен вовсе, потому что решение уже принято. Последовательные
  // `await` стоили лишнего круга на каждом рендере и каждом обходе.
  const [page, total] = await Promise.all([
    fetchPageBySystemKey(lang, 'authors-hub'),
    query.search ? Promise.resolve(null) : countAuthors(lang, query),
  ]);

  const dict = getDictionary(lang);
  const title = page?.seo?.metaTitle || page?.h1 || page?.title || dict.authors.metaTitle;
  const description =
    page?.seo?.metaDescription || page?.shortDescription || dict.authors.metaDescription;

  const meta = getPageMetadata(lang, '/authors', title, description, query.page);

  return applyAuthorsRobots(
    meta,
    resolveAuthorsRobots({ query, total, editorial: page?.seo?.robots })
  );
}

export default async function AuthorsPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;
  const query = parseAuthorsQuery((await searchParams) ?? {}, null);

  // Список авторов и есть эта страница, поэтому он намеренно без `try/catch`:
  // упавший запрос обязан дать 5xx, а не 200 с «авторов нет» — пустой хаб
  // с `index` учит поисковик, что авторов у сайта не осталось. Ровно так же
  // сделано на жанрах, там же и комментарий об этом.
  //
  // ⚠️ Указатель — другое дело: это второстепенный блок, и `AuthorsAlphabet`
  // умеет не рисоваться на пустом списке. Ронять из-за него страницу, сетка
  // которой уже пришла, было бы обменом целого на часть.
  const [page, authors, letters] = await Promise.all([
    fetchPageBySystemKey(lang, 'authors-hub'),
    loadAuthors(lang, query),
    loadAuthorLetters(lang, query.search || undefined).catch((error) => {
      logError('authors hub: letters', error);
      return [];
    }),
  ]);

  const dict = getDictionary(lang);
  const siteUrl = getSiteUrl();
  const title = page?.h1 || page?.title || dict.authors.title;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, url: `${siteUrl}/${lang}` },
      { name: title, url: `${siteUrl}/${lang}/authors` },
    ],
    `${siteUrl}/${lang}/authors`
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <AuthorsHub
        authors={authors.data}
        lang={lang}
        letters={letters}
        meta={authors.meta}
        page={page}
        query={query}
      />
    </>
  );
}
