import { isWorldObjectType, type WorldObjectType } from '@/lib/admin/book-world-blocks';
import type { WorldStrings } from '@/lib/i18n/worldStrings';

/*
 * Формулы h1 и title страницы сущности по типу (`product.md` §15) - одним местом, чтобы новый тип
 * не получил формулу героя в одном из двух. Пара собирается отдельно (имена героев).
 */

/**
 * Формула h1: место, предмет, понятие, событие - «{Имя} в книге «{Книга}»» (решения `F08 | F08-12`
 * Q5, `F08 | F08-13` Q7); герой и прочее - формулой героя.
 */
export function entityPageTitle(type: string, strings: WorldStrings): string {
  return type === 'place' || isWorldObjectType(type)
    ? strings.worldPlaceTitle
    : strings.worldEntityTitle;
}

/**
 * Формула title: место, предмет, понятие, событие - своим хвостом (решения `F08 | F08-12` Q5,
 * `F08 | F08-13` Q7); герой и прочее - формулой героя.
 */
export function entityMetaTitle(type: string, strings: WorldStrings): string {
  const byType: Record<'place' | WorldObjectType, string> = {
    place: strings.worldPlaceMetaTitle,
    object: strings.worldObjectMetaTitle,
    term: strings.worldTermMetaTitle,
    event: strings.worldEventMetaTitle,
  };
  return type === 'place' || isWorldObjectType(type) ? byType[type] : strings.worldEntityMetaTitle;
}
