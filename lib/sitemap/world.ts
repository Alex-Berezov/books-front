import { getPublicWorldSitemap } from '@/api/endpoints/public';
import { worldOwnCluster } from '@/lib/seo/book-world';
import { buildLangUrl } from '@/lib/seo/urls';
import { worldEntityPath, worldPath } from '@/lib/seo/world-path';
import {
  fetchPagedSitemapFile,
  fetchPagedSitemapTotal,
  isIsoDate,
  parsePagedSitemapFile,
} from '@/lib/sitemap/paged-sitemap';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SitemapItem } from '@/lib/sitemap/utils';
import type { BookWorldAlternate } from '@/types/api-schema';

/**
 * Карта мира книги (F08-3b, решение арбитра `F08 | F08-3` Q1, Q4): файл `sitemap-world-{lang}-{n}.xml` -
 * ровно одна страница ручки `GET /{lang}/world/sitemap`. Элемент ручки - опубликованная версия:
 * её общая `/wiki` и индексируемые сущности (не больше 100 на версию), поэтому файл - не больше
 * 50 × 101 адресов, в пределе протокола. Книги с редакторским `noindex` ручка не отдаёт (Q4),
 * кластеры языков - тоже её (`alternates`): фронт только строит адреса и ничего не решает сам.
 */
// Копия потолка `limit` ручки (`SITEMAP_PAGE_MAX_LIMIT` в `books/src/shared/dto/sitemap-page-query.dto.ts`):
// больше - 400 и 503 на каждом файле карты. Менять вместе.
export const WORLD_SITEMAP_PAGE_SIZE = 50;

export const WORLD_SITEMAP_PREFIX = 'sitemap-world';

export const parseWorldSitemapFile = (filename: string, supportedLangs: readonly string[]) =>
  parsePagedSitemapFile(WORLD_SITEMAP_PREFIX, filename, supportedLangs);

/** Число версий с миром на языке - для индекса карты; `null` - счёт неизвестен (`LEGACY-082`). */
export const fetchWorldSitemapTotal = (lang: string): Promise<number | null> =>
  fetchPagedSitemapTotal(getPublicWorldSitemap, lang);

const isAlternateList = (value: unknown): value is BookWorldAlternate[] =>
  Array.isArray(value) &&
  value.every(
    (a: unknown) =>
      typeof (a as BookWorldAlternate)?.language === 'string' &&
      typeof (a as BookWorldAlternate)?.slug === 'string'
  );

/**
 * Кластер hreflang записи карты - то же правило, что у мета страницы (`worldOwnCluster`): кластер без
 * самого языка файла не отдаётся, пустой (страница не индексируется) блока `hreflang` не даёт.
 */
function clusterOf(
  alternates: BookWorldAlternate[],
  lang: string,
  entityKey?: string
): { languages: Record<string, string> } | undefined {
  const languages = worldOwnCluster(alternates, lang, entityKey);
  return languages ? { languages } : undefined;
}

/**
 * Адреса одного файла: общая страница мира и страницы сущностей рядом, `lastmod` - из ответа.
 * Усечённая страница, ответ не той формы или элемент без даты - отказ (файл отвечает 503), а не
 * похудевшая карта и не «сейчас» в `lastmod`.
 */
export async function buildWorldSitemapItems(
  lang: SupportedLang,
  page: number,
  fetchPage = getPublicWorldSitemap
): Promise<SitemapItem[]> {
  const where = `world ${lang} file${page}`;
  const versions = await fetchPagedSitemapFile(
    fetchPage,
    lang,
    page,
    WORLD_SITEMAP_PAGE_SIZE,
    where
  );
  return versions.flatMap((version) => {
    if (
      typeof version?.slug !== 'string' ||
      !version.slug ||
      !isIsoDate(version.lastmod) ||
      !isAlternateList(version.alternates) ||
      !Array.isArray(version.entities)
    ) {
      throw new Error(`${where}: версия не той формы`);
    }
    const general = clusterOf(version.alternates, lang);
    const items: SitemapItem[] = [
      {
        url: buildLangUrl(lang, worldPath(version.slug)),
        lastModified: version.lastmod,
        changeFrequency: 'weekly',
        priority: 0.6,
        ...(general ? { alternates: general } : {}),
      },
    ];
    for (const entity of version.entities) {
      if (
        typeof entity?.key !== 'string' ||
        !entity.key ||
        !isIsoDate(entity.lastmod) ||
        !isAlternateList(entity.alternates)
      ) {
        throw new Error(`${where}: сущность версии "${version.slug}" не той формы`);
      }
      const cluster = clusterOf(entity.alternates, lang, entity.key);
      items.push({
        url: buildLangUrl(lang, worldEntityPath(version.slug, entity.key)),
        lastModified: entity.lastmod,
        changeFrequency: 'weekly',
        priority: 0.6,
        ...(cluster ? { alternates: cluster } : {}),
      });
    }
    return items;
  });
}
