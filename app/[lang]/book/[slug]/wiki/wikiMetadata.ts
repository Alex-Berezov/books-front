import { fillTemplate } from '@/lib/book-world/format';
import { canonicalPairMembers, pairDisplayName } from '@/lib/book-world/pair';
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
import { logError } from '@/lib/utils/log-error';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { VersionPreview } from '@/types/api-schema';
import type { Metadata } from 'next';
import { getCachedBookOverview, getCachedBookSeo } from '../bookData';
import {
  analysisOf,
  getCachedBookWorld,
  getCachedBookWorldEntity,
  getCachedBookWorldIndex,
} from './wikiData';
import { entityMetaTitle } from './worldEntityTitles';
import { buildWorldPeople } from './worldPeople';

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
    const world = version ? await getCachedBookWorldIndex(version.id) : null;
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
 * Имя пары для title (F08-8c) - тем же путём, что h1 страницы (`buildWorldPeople`): список мира, затем
 * анализ, затем имя сущности. Список не загрузился - отказ в журнале, имена из анализа или имя
 * сущности (мета от этого не падает).
 */
async function pairDisplayNameForMeta(
  version: VersionPreview,
  key: string,
  fallback: string,
  template: string
): Promise<string> {
  const [world, analysis] = await Promise.all([
    getCachedBookWorld(version.id).catch((error: unknown) => {
      logError('Error loading book world list for pair metadata:', error);
      return null;
    }),
    analysisOf(version),
  ]);
  const people = buildWorldPeople(world?.entities ?? [], analysis?.characters, () => null);
  return pairDisplayName(template, key, (k) => people.get(k)?.name, fallback);
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
    // Пара с неканоническим ключом (`b--a`, `a--a`) - не страница: сама страница отвечает 404
    // (`page.tsx`), мета - как у 404: без title пары, canonical и hreflang.
    if (entity.type === 'pair' && canonicalPairMembers(key) === null) return { robots: NOINDEX };
    const strings = getWorldStrings(supportedLang);
    const title = version.title || book.title;
    const author = version.author || book.author || dict.book.unknownAuthor;
    const metaTitle =
      entity.type === 'pair'
        ? fillTemplate(strings.worldPairMetaTitle, {
            names: await pairDisplayNameForMeta(version, key, entity.name, strings.worldPairNames),
            title,
            author,
          })
        : fillTemplate(entityMetaTitle(entity.type, strings), { name: entity.name, title, author });
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
