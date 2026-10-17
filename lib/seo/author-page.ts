import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { htmlToPlainText, truncateAtWord } from '@/lib/utils/html-text';
import { isSafeHref } from '@/lib/utils/safe-href';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorAlternate, PublicAuthorDetail } from '@/types/api-schema';
import { buildIndexableAlternates } from './hreflang-alternates';
import { buildLangUrl } from './urls';

/**
 * Адрес, `@id` и `hreflang` страницы автора — одно место на страницу и её разметку (F02-1).
 */

/** Публичный адрес автора на языке: тот же вид, что у карты сайта (`/{lang}/author/{slug}`). */
export function authorUrl(lang: string, slug: string): string {
  return buildLangUrl(lang, `/author/${slug}`);
}

/**
 * `@id` разметки `Person` — **та же строка**, на которую ссылается разметка книги
 * (`books/src/modules/seo/schema/generateBookSchema.ts`: `${authorCanonical}#person`).
 * Бэкенд пропускает адрес через `normalizeUrl` — путь в нижнем регистре, без конечного `/`;
 * здесь то же, иначе граф автора и граф книги описывали бы двух разных людей.
 */
export function authorPersonId(lang: string, slug: string): string {
  return nodeId(authorUrl(lang, slug), 'person');
}

/**
 * Кластер `hreflang` страницы автора — **по правилу карты сайта**: только индексируемые
 * языки (опубликованных книг на языке больше нуля), `x-default` — из отобранного набора
 * (`buildIndexableAlternates`, общий с веткой авторов в `app/sitemaps/[filename]/route.ts`).
 *
 * Нет поля `alternates` (ответ бэкенда до F02-1) — `undefined`: блок альтернатив не выводится
 * вовсе. Возврат к пяти языкам с одним слагом (`buildAlternateLanguages`) и есть дефект,
 * который здесь закрыт: слаг автора свой у каждого языка.
 */
export function buildAuthorHreflang(
  alternates: PublicAuthorAlternate[] | undefined
): Record<string, string> | undefined {
  if (!alternates) return undefined;
  return buildIndexableAlternates(
    alternates
      .filter((a) => (SUPPORTED_LANGS as readonly string[]).includes(a.lang))
      .map((a) => ({ language: a.lang, slug: a.slug, linkable: a.indexable })),
    authorUrl
  );
}

/**
 * Описание страницы из начала биографии: без тегов, не длиннее `max` знаков (`product.md` F02,
 * §18). Режется по границе слова, если она не слишком далеко; пустая биография — `undefined`.
 */
export function describeFromBiography(
  html: string | null | undefined,
  max = 160
): string | undefined {
  if (!html) return undefined;
  return truncateAtWord(htmlToPlainText(html), max);
}

/**
 * Описание страницы и `Person`: своё → `tagline` → начало биографии (`product.md` F02, §18).
 */
export function describeAuthor(
  author: Pick<PublicAuthorDetail, 'seo' | 'tagline' | 'biography'>
): string | undefined {
  return (
    author.seo?.metaDescription ||
    author.tagline?.trim() ||
    describeFromBiography(author.biography) ||
    undefined
  );
}

/** `url` и `@id` узла — тем же приведением, что `authorPersonId` и `normalizeUrl` бэкенда. */
function nodeId(url: string, fragment: string): string {
  const parsed = new URL(url);
  let pathname = parsed.pathname.toLowerCase();
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  parsed.pathname = pathname;
  return `${parsed.toString()}#${fragment}`;
}

type AuthorGraphInput = Pick<
  PublicAuthorDetail,
  | 'slug'
  | 'name'
  | 'nativeName'
  | 'photoUrl'
  | 'photoCredit'
  | 'tagline'
  | 'biography'
  | 'seo'
  | 'birthDate'
  | 'deathDate'
  | 'wikidataUrl'
  | 'wikipediaUrl'
  | 'facts'
  | 'awards'
  | 'books'
  | 'booksTotal'
>;

const named = (type: string, name: string | undefined) =>
  name?.trim() ? { '@type': type, name: name.trim() } : undefined;

/**
 * Узел `Person` (F02-1, расширен в F02-3 по `product.md` §18): `@id` — тот же, на который
 * ссылается разметка книг этого автора. В `award` — только полученные награды, номинация
 * наградой не является (решение арбитра 15.10.2026, `F02 | F02-3`, Р10).
 */
function buildAuthorPersonNode(lang: string, author: AuthorGraphInput): Record<string, unknown> {
  const facts = author.facts ?? {};
  // Адреса пишет контент-менеджер (`LEGACY-447`): в разметку — только http(s), как и в шапку.
  const sameAs = [author.wikidataUrl, author.wikipediaUrl].filter(isSafeHref);
  const description = describeAuthor(author);
  const alternateName = [
    author.nativeName && author.nativeName.trim() !== author.name ? author.nativeName.trim() : null,
    ...(facts.pseudonyms ?? []),
  ].filter((v): v is string => Boolean(v));
  const awards = (author.awards ?? [])
    .filter((a) => !a.nomination)
    .map((a) => (a.year ? `${a.name} (${a.year})` : a.name));
  const credit = author.photoCredit;
  const image = author.photoUrl
    ? credit
      ? {
          '@type': 'ImageObject',
          url: author.photoUrl,
          contentUrl: author.photoUrl,
          creditText: credit.author,
          // Адреса пишет контент-менеджер: в разметку — только http(s), как и в видимую подпись.
          ...(isSafeHref(credit.licenseUrl) ? { license: credit.licenseUrl } : {}),
          ...(isSafeHref(credit.sourceUrl) ? { acquireLicensePage: credit.sourceUrl } : {}),
        }
      : author.photoUrl
    : undefined;

  const node: Record<string, unknown> = {
    '@type': 'Person',
    '@id': authorPersonId(lang, author.slug),
    name: author.name,
    url: authorUrl(lang, author.slug),
    ...(alternateName.length > 0 ? { alternateName } : {}),
    ...(image ? { image } : {}),
    ...(description ? { description } : {}),
    ...(author.birthDate ? { birthDate: author.birthDate } : {}),
    ...(author.deathDate ? { deathDate: author.deathDate } : {}),
  };
  const birthPlace = named('Place', facts.birthPlace);
  const deathPlace = named('Place', facts.deathPlace);
  const nationality = named('Country', facts.nationality);
  if (birthPlace) node.birthPlace = birthPlace;
  if (deathPlace) node.deathPlace = deathPlace;
  if (nationality) node.nationality = nationality;
  if (facts.occupations?.length) {
    node.hasOccupation = facts.occupations.map((name) => ({ '@type': 'Occupation', name }));
  }
  if (awards.length > 0) node.award = awards;
  if (facts.genres?.length) node.knowsAbout = facts.genres;
  if (sameAs.length > 0) node.sameAs = sameAs;
  return node;
}

/**
 * Разметка страницы автора одним `@graph` (`tech.md` F02, §7; решение арбитра 14.10.2026,
 * `F02 | F02-1`): `WebPage` → `Person`, `Person`, `ItemList` показанных книг
 * с `numberOfItems` = все книги (решение арбитра 15.10.2026, `F02 | F02-3`, Р11), крошки.
 * `FAQPage` — отдельным блоком `FaqBlock` (там же, Р5).
 */
export function buildAuthorPageGraph(
  lang: string,
  author: AuthorGraphInput,
  crumbs: { home: string; authors: string }
): Record<string, unknown> {
  const pageUrl = authorUrl(lang, author.slug);
  const personId = authorPersonId(lang, author.slug);
  const description = describeAuthor(author);
  const books = author.books ?? [];

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': nodeId(pageUrl, 'webpage'),
      url: pageUrl,
      name: author.name,
      inLanguage: lang,
      ...(description ? { description } : {}),
      mainEntity: { '@id': personId },
      breadcrumb: { '@id': nodeId(pageUrl, 'breadcrumb') },
    },
    buildAuthorPersonNode(lang, author),
  ];

  if (books.length > 0) {
    graph.push({
      '@type': 'ItemList',
      '@id': nodeId(pageUrl, 'books'),
      numberOfItems: author.booksTotal ?? books.length,
      itemListElement: books.map((book, index) => {
        const bookUrl = buildLangUrl(lang, `/book/${book.slug || book.id}`);
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Book',
            '@id': nodeId(bookUrl, 'book'),
            name: book.title,
            url: bookUrl,
            author: { '@id': personId },
          },
        };
      }),
    });
  }

  graph.push({
    '@type': 'BreadcrumbList',
    '@id': nodeId(pageUrl, 'breadcrumb'),
    itemListElement: [
      { name: crumbs.home, item: buildLangUrl(lang) },
      { name: crumbs.authors, item: buildLangUrl(lang, '/authors') },
      { name: author.name, item: pageUrl },
    ].map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
  });

  return { '@context': 'https://schema.org', '@graph': graph };
}

/**
 * Запасное имя для метаданных, пока ответа нет (сбой бэкенда): из слага адреса, слова
 * с заглавной. Ссылки и разметку из него не строят — только заголовок вкладки.
 */
export function authorNameFromSlug(slug: string): string {
  let words: string;
  try {
    words = decodeURIComponent(slug).replace(/-/g, ' ');
  } catch {
    words = slug.replace(/-/g, ' ');
  }
  return words.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

/** Шаблоны заголовка и описания страницы автора — когда своих нет и биографии тоже. */
export function authorFallbackMeta(
  lang: SupportedLang,
  name: string
): { title: string; description: string } {
  switch (lang) {
    case 'ru':
      return {
        title: `${name} — Книги, биография и аудиокниги | Bibliaris`,
        description: `Откройте для себя книги, биографию, цитаты и классические аудиокниги автора ${name} на Bibliaris. Читайте и слушайте онлайн бесплатно.`,
      };
    case 'es':
      return {
        title: `${name} - Libros, biografía y audiolibros | Bibliaris`,
        description: `Explora libros, biografía, frases y audiolibros clásicos de ${name} en Bibliaris. Lee y escucha en línea gratis.`,
      };
    case 'pt':
      return {
        title: `${name} - Livros, biografia e audiolivros | Bibliaris`,
        description: `Explore livros, biografia, frases e audiolivros clássicos de ${name} no Bibliaris. Leia e ouça online gratuitamente.`,
      };
    case 'fr':
      return {
        title: `${name} - Livres, biographie et livres audio | Bibliaris`,
        description: `Découvrez les livres, la biographie, les citations et les livres audio classiques de ${name} sur Bibliaris. Lisez et écoutez gratuitement en ligne.`,
      };
    case 'en':
    default:
      return {
        title: `${name} Books, Biography & Audiobooks | Bibliaris`,
        description: `Explore books, biography, quotes, and classic audiobooks by ${name} on Bibliaris. Read and listen online for free.`,
      };
  }
}
