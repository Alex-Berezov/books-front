import { isLinkableEntity } from '@/lib/book-world/link-entities';
import { canonicalPairMembers, pairDisplayName, pairMembers } from '@/lib/book-world/pair';
import type { WorldPairLink, WorldPerson } from './worldEntityTypes';
import type { BookWorldEntitySummary } from '@/types/api-schema';

/**
 * Герои версии по ключу: запасные имена из анализа, поверх них - сущности списка мира (публичные, со
 * страницей). Один путь имён для страницы сущности и её мета: h1, хлебная крошка и title пары
 * называют героев одинаково.
 */
export function buildWorldPeople(
  entities: readonly BookWorldEntitySummary[],
  analysisCharacters: readonly { key: string; name: string }[] | null | undefined,
  hrefOf: (key: string) => string | null
): Map<string, WorldPerson> {
  const people = new Map<string, WorldPerson>();
  for (const c of analysisCharacters ?? []) people.set(c.key, { name: c.name, href: null });
  for (const e of entities)
    people.set(e.key, { name: e.name, href: hrefOf(e.key), short: e.short });
  return people;
}

/**
 * Пара из списка мира, на которую ставится ссылка: тип `pair`, публична (ядро, не ответ редактору) и
 * ключ в каноническом виде `{a}--{b}` (два разных героя по алфавиту) - иначе страницы у неё нет.
 * Копия правила порядка и различия героев из checkWorldPair (books/src/modules/book-world/world-refs.ts);
 * менять вместе.
 */
export function isListedPair(e: BookWorldEntitySummary): boolean {
  if (e.type !== 'pair' || !isLinkableEntity(e)) return false;
  return canonicalPairMembers(e.key) !== null;
}

/**
 * Публичные пары героя `heroKey` (F08-8c, `product.md` §5 п.10): по одной на пару, по ключу пары; имя -
 * герои в порядке ключа, как в h1 пары, нет имени - имя сущности пары.
 */
export function worldPairLinks(input: {
  entities: readonly BookWorldEntitySummary[];
  heroKey: string;
  people: ReadonlyMap<string, WorldPerson>;
  namesTemplate: string;
  hrefOf: (key: string) => string;
}): WorldPairLink[] {
  const { heroKey, people } = input;
  const byKey = new Map<string, WorldPairLink>();
  for (const e of input.entities) {
    if (!isListedPair(e) || !pairMembers(e.key)?.includes(heroKey) || byKey.has(e.key)) continue;
    byKey.set(e.key, {
      key: e.key,
      href: input.hrefOf(e.key),
      names: pairDisplayName(input.namesTemplate, e.key, (k) => people.get(k)?.name, e.name),
    });
  }
  return [...byKey.values()].sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
}
