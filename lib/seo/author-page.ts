import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
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
  const url = new URL(authorUrl(lang, slug));
  let pathname = url.pathname.toLowerCase();
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  url.pathname = pathname;
  return `${url.toString()}#person`;
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

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

/** Именованные сущности из списка выше и любые числовые (`&#8217;`, `&#x2014;`). */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code =
        name[1] === 'x' || name[1] === 'X'
          ? parseInt(name.slice(2), 16)
          : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return HTML_ENTITIES[name.toLowerCase()] ?? whole;
  });
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
  const text = decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  if (text.length <= max) return text;

  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const head = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${head.replace(/[\s,;:.—–-]+$/, '')}…`;
}

/**
 * Разметка `Person` страницы автора: выводится всегда; `@id` — тот же, на который ссылается
 * разметка книг этого автора. Описание — в том же порядке, что у страницы: своё → биография.
 */
export function buildAuthorPersonJsonLd(
  lang: string,
  author: Pick<
    PublicAuthorDetail,
    | 'slug'
    | 'name'
    | 'photoUrl'
    | 'biography'
    | 'seo'
    | 'birthDate'
    | 'deathDate'
    | 'wikidataUrl'
    | 'wikipediaUrl'
  >
): Record<string, unknown> {
  const sameAs = [author.wikidataUrl, author.wikipediaUrl].filter(Boolean);
  const description =
    author.seo?.metaDescription || describeFromBiography(author.biography) || undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': authorPersonId(lang, author.slug),
    name: author.name,
    url: authorUrl(lang, author.slug),
    ...(author.photoUrl ? { image: author.photoUrl } : {}),
    ...(description ? { description } : {}),
    ...(author.birthDate ? { birthDate: author.birthDate } : {}),
    ...(author.deathDate ? { deathDate: author.deathDate } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
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
