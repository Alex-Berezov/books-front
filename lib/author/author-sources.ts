import { isSafeHref } from '@/lib/utils/safe-href';
import type { PublicAuthorDetail } from '@/types/api-schema';

/** Источники страницы автора (F02-4, `product.md` §16): список ссылок блока «Источники». */

export interface AuthorSourceLink {
  title: string;
  url: string;
}

/**
 * Ключ сравнения адресов: схема и хост без учёта регистра, без хвостового `/`; путь, query
 * и `http`/`https` не трогаются (решение арбитра 16.10.2026, `F02 | F02-4`, Р5).
 */
function sourceKey(url: string): string {
  const { protocol, host, pathname, search, hash } = new URL(url);
  const path = pathname.replace(/\/$/, '');
  return `${protocol.toLowerCase()}//${host.toLowerCase()}${path}${search}${hash}`;
}

/**
 * Список источников: сначала `sources` в порядке данных, затем Википедия и Wikidata автора;
 * повтор адреса пропускается, остаётся первая запись со своим названием (Р5). Ссылки — только
 * `http(s)` (`LEGACY-447`).
 */
export function collectAuthorSources(
  author: Pick<PublicAuthorDetail, 'sources' | 'wikipediaUrl' | 'wikidataUrl'>
): AuthorSourceLink[] {
  const candidates: AuthorSourceLink[] = [
    ...(author.sources ?? []).map((s) => ({ title: s.title.trim(), url: s.url })),
    { title: 'Wikipedia', url: author.wikipediaUrl ?? '' },
    { title: 'Wikidata', url: author.wikidataUrl ?? '' },
  ];
  const seen = new Set<string>();
  const result: AuthorSourceLink[] = [];
  for (const candidate of candidates) {
    if (!candidate.title || !isSafeHref(candidate.url)) continue;
    const key = sourceKey(candidate.url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}
