import { fillTemplate } from '@/lib/book-world/format';
import { isRightsBlockedError } from '@/lib/errors';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getWorldStrings, worldIndexMetaTitle } from '@/lib/i18n/worldStrings';
import {
  describeWorld,
  isWorldEntityKey,
  pickWorldPageVersion,
  worldOwnCluster,
  worldPageSlug,
} from '@/lib/seo/book-world';
import { noteDegraded } from '@/lib/seo/degraded';
import { robotsHasNoindex } from '@/lib/seo/robots-noindex';
import { buildLangUrl } from '@/lib/seo/urls';
import { worldEntityPath, worldPath } from '@/lib/seo/world-path';
import { isNotFoundError } from '@/lib/utils/content-failure';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { getCachedBookOverview, getCachedBookSeo } from '../bookData';
import { getCachedBookWorld, getCachedBookWorldEntity } from './wikiData';

const NOINDEX = { index: false, follow: true } as const;

/** openGraph и twitter страниц мира: те же title и description, что у страницы. */
function socialMeta(input: {
  title: string;
  description: string | undefined;
  url: string;
  lang: SupportedLang;
  cover: { url: string; alt: string } | null;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const { title, description } = input;
  return {
    openGraph: {
      title,
      description,
      type: 'article',
      url: input.url,
      locale: input.lang,
      images: input.cover ? [input.cover] : undefined,
    },
    twitter: { card: 'summary', title, description },
  };
}

/**
 * Отказ сборки мета: 404 и 451 (правовой отказ) - страницы нет, тело ответит так же (как
 * `analysisMetadata.ts`); это не отказ транспорта, и в журнал деградации он не идёт. Остальное -
 * запись в журнал деградации и отказ наверх.
 */
function metadataFailure(error: unknown, lang: SupportedLang, slug: string): Metadata {
  if (isNotFoundError(error) || isRightsBlockedError(error)) return { robots: NOINDEX };
  noteDegraded({
    surface: 'book-world',
    reason: 'bundle-unreadable',
    lang,
    slug,
    outcome: 'threw-5xx',
  });
  throw error;
}

/**
 * Мета общей страницы мира (`product.md` §15-§16, решение арбитра `F08 | F08-3` Q10): title - h1 +
 * автор, как у анализа; description - формула языка; canonical на себя; hreflang - поле `alternates`
 * ответа. Общая страница индексируется всегда, пока книга не закрыта редактором от индекса
 * (`noindex, follow` и вне hreflang). Страницы нет - `noindex`: тело ответит 404.
 */
export async function buildWorldIndexMetadata(
  supportedLang: SupportedLang,
  slug: string
): Promise<Metadata> {
  const dict = getDictionary(supportedLang);

  try {
    const [book, bookSeo] = await Promise.all([
      getCachedBookOverview(supportedLang, slug),
      getCachedBookSeo(supportedLang, slug),
    ]);
    const version = book ? pickWorldPageVersion(book, supportedLang) : null;
    const world = version ? await getCachedBookWorld(version.id) : null;
    if (!book || !version || !world || world.entities.length === 0) {
      return { robots: NOINDEX };
    }

    const strings = getWorldStrings(supportedLang);
    const title = version.title || book.title;
    const author = version.author || book.author || dict.book.unknownAuthor;
    const metaTitle = worldIndexMetaTitle(supportedLang, title, author);
    const description = describeWorld(
      fillTemplate(strings.worldIndexDescription, { title, author })
    );
    const canonical = buildLangUrl(supportedLang, worldPath(worldPageSlug(version, book, slug)));
    const bookClosed = robotsHasNoindex(bookSeo.meta.robots);

    return {
      title: metaTitle,
      description,
      ...(bookClosed ? { robots: NOINDEX } : {}),
      alternates: {
        canonical,
        languages: bookClosed ? undefined : worldOwnCluster(world.alternates, supportedLang),
      },
      ...socialMeta({
        title: metaTitle,
        description,
        url: canonical,
        lang: supportedLang,
        cover: book.coverUrl ? { url: book.coverUrl, alt: version.coverAlt || title } : null,
      }),
    };
  } catch (error) {
    return metadataFailure(error, supportedLang, slug);
  }
}

/**
 * Мета страницы сущности: title и description по §15 («Коротко» до 160 знаков), canonical на себя,
 * hreflang - поле `alternates` ответа сущности. `isIndexable=false` и редакторский `noindex` книги -
 * `noindex, follow` и вне hreflang.
 */
export async function buildWorldEntityMetadata(
  supportedLang: SupportedLang,
  slug: string,
  key: string
): Promise<Metadata> {
  const dict = getDictionary(supportedLang);
  if (!isWorldEntityKey(key)) return { robots: NOINDEX };

  try {
    const [book, bookSeo] = await Promise.all([
      getCachedBookOverview(supportedLang, slug),
      getCachedBookSeo(supportedLang, slug),
    ]);
    const version = book ? pickWorldPageVersion(book, supportedLang) : null;
    const detail = version ? await getCachedBookWorldEntity(version.id, key) : null;
    if (!book || !version || !detail) return { robots: NOINDEX };

    const { entity } = detail;
    const strings = getWorldStrings(supportedLang);
    const title = version.title || book.title;
    const author = version.author || book.author || dict.book.unknownAuthor;
    const metaTitle = fillTemplate(strings.worldEntityMetaTitle, {
      name: entity.name,
      title,
      author,
    });
    const description = describeWorld(entity.short);
    const canonical = buildLangUrl(
      supportedLang,
      worldEntityPath(worldPageSlug(version, book, slug), key)
    );
    const closed = !entity.isIndexable || robotsHasNoindex(bookSeo.meta.robots);

    return {
      title: metaTitle,
      description,
      ...(closed ? { robots: NOINDEX } : {}),
      alternates: {
        canonical,
        languages: closed ? undefined : worldOwnCluster(detail.alternates, supportedLang, key),
      },
      ...socialMeta({
        title: metaTitle,
        description,
        url: canonical,
        lang: supportedLang,
        cover: book.coverUrl ? { url: book.coverUrl, alt: version.coverAlt || title } : null,
      }),
    };
  } catch (error) {
    return metadataFailure(error, supportedLang, slug);
  }
}
