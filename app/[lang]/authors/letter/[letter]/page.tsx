import { notFound } from 'next/navigation';
import {
  AuthorsHub,
  applyAuthorsRobots,
  authorsBasePath,
  buildLetterAlternates,
  countAuthors,
  loadAuthorLetters,
  loadAuthors,
  loadLetterAvailability,
  parseAuthorsQuery,
  resolveAuthorsRobots,
} from '@/components/public/authors';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { fetchPageBySystemKey } from '@/lib/utils/fetch-page';
import { buildBreadcrumbJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string; letter: string }> | { lang: string; letter: string };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export const revalidate = 300;

/**
 * Буква из адреса в том виде, в каком её показывает указатель.
 *
 * Адрес приходит закодированным и в нижнем регистре; сравнивать с алфавитом надо
 * в верхнем. Обратно в адрес она уходит только через `authorsBasePath` —
 * единственное место, где адрес буквенной страницы собирается.
 */
function decodeLetter(raw: string): string {
  try {
    return decodeURIComponent(raw).toUpperCase();
  } catch {
    // Битая процентная последовательность — это не буква, дальше её отсеет 404.
    return raw.toUpperCase();
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;
  const letter = decodeLetter(resolvedParams.letter);
  const query = parseAuthorsQuery((await searchParams) ?? {}, letter);

  // Четыре независимых источника — одним кругом. Ни один из них не зависит от
  // результата остальных: язык и буква известны на входе.
  const [page, letters, availability, total] = await Promise.all([
    fetchPageBySystemKey(lang, 'authors-hub'),
    loadAuthorLetters(lang).catch(() => []),
    loadLetterAvailability(letter),
    query.search ? Promise.resolve(null) : countAuthors(lang, query),
  ]);

  const known = letters.find((entry) => entry.letter === letter);
  const dict = getDictionary(lang);

  const baseTitle = page?.seo?.metaTitle || page?.h1 || page?.title || dict.authors.metaTitle;
  const description =
    page?.seo?.metaDescription || page?.shortDescription || dict.authors.metaDescription;

  const path = authorsBasePath(lang, letter).replace(`/${lang}`, '');
  const meta = getPageMetadata(lang, path, `${letter} — ${baseTitle}`, description, query.page);

  const alternates = buildLetterAlternates(letter, lang, availability, getSiteUrl(), query.page);
  const withAlternates: Metadata = alternates
    ? { ...meta, alternates: { ...meta.alternates, languages: alternates } }
    : meta;

  return applyAuthorsRobots(
    withAlternates,
    resolveAuthorsRobots({
      query,
      total,
      letterCount: known ? known.count : null,
      editorial: page?.seo?.robots,
    })
  );
}

export default async function AuthorsByLetterPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;
  const letter = decodeLetter(resolvedParams.letter);
  const query = parseAuthorsQuery((await searchParams) ?? {}, letter);

  // Здесь список букв — не второстепенный блок, как на хабе: по нему решается
  // 404. Поэтому он без деградации, и его отказ обязан стать 5xx: отдать 404
  // на живую букву значило бы выкинуть страницу из индекса на время сбоя.
  // ⚠️ Со `search`: указатель рисуется над отфильтрованной сеткой и обязан
  // описывать её. На решение о 404 это не влияет — ручка отдаёт весь алфавит
  // языка, включая буквы с нулём, поэтому существование буквы от поиска
  // не зависит, меняются только счётчики.
  const [page, letters] = await Promise.all([
    fetchPageBySystemKey(lang, 'authors-hub'),
    loadAuthorLetters(lang, query.search || undefined),
  ]);

  // Буква не из алфавита этого языка — не пустая страница, а несуществующий
  // адрес. 200 на нём плодил бы бесконечную россыпь пустых страниц под любую
  // последовательность символов.
  if (!letters.some((entry) => entry.letter === letter)) {
    notFound();
  }

  // Дальше — как на хабе: отказ обязан стать 5xx, а не пустой страницей.
  const authors = await loadAuthors(lang, query);

  const dict = getDictionary(lang);
  const siteUrl = getSiteUrl();
  const hubTitle = page?.h1 || page?.title || dict.authors.title;
  const url = `${siteUrl}${authorsBasePath(lang, letter)}`;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, url: `${siteUrl}/${lang}` },
      { name: hubTitle, url: `${siteUrl}/${lang}/authors` },
      { name: letter, url },
    ],
    url
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
