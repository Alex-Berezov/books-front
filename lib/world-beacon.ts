import type { WorldStatEvent } from '@/types/api-schema';

/**
 * Счётчик страниц мира книги (F08-3b, `product.md` §14): общее для клиента (`WorldBeacon`) и
 * серверного маршрута `app/api/world/beacon/route.ts`. Без зависимостей: файл едет в клиентский
 * бандл.
 */

/** Адрес маршрута фронта, который ставит `X-Visitor-IP` и пересылает событие в API. */
export const WORLD_BEACON_PATH = '/api/world/beacon';

/**
 * Список ровно из всех членов `T`: лишнее значение не пройдёт `T`, пропущенное - даст ошибку типов
 * «missing event». Новое событие в `WorldStatEvent` без строки в списке ниже не соберётся.
 */
const exhaustiveList =
  <T extends string>() =>
  <const L extends readonly T[]>(list: L & ([T] extends [L[number]] ? unknown : 'missing event')) =>
    list;

/** Закрытый список событий ручки `POST api/world/beacon` (решение арбитра `F08 | F08-3` Q5). */
export const WORLD_BEACON_EVENTS = exhaustiveList<WorldStatEvent>()([
  'view',
  'to_reader',
  'to_audio',
  'to_world',
  'to_analysis',
  'to_summary',
  'engaged',
]);

/** Событие перехода по ссылке: читалка, аудио, мир книги, анализ, пересказ. */
export type WorldLinkEvent = Extract<
  WorldStatEvent,
  'to_reader' | 'to_audio' | 'to_world' | 'to_analysis' | 'to_summary'
>;

/** Раздел книги в адресе ссылки -> событие перехода. */
const SECTION_EVENTS: Readonly<Record<string, WorldLinkEvent>> = {
  read: 'to_reader',
  listen: 'to_audio',
  wiki: 'to_world',
  analysis: 'to_analysis',
  summary: 'to_summary',
};

/** Путь книги `/{lang}/book/{slug}/{раздел}`; хост абсолютного адреса пропускается. */
const BOOK_SECTION_PATH = /^(?:https?:\/\/[^/]+)?\/[a-z]{2}\/book\/[^/]+\/([^/]+)(?:\/|$)/;

/**
 * Куда ведёт ссылка со страницы мира: по сегменту книги `/book/{slug}/{раздел}[/...]`.
 * Читалка `/read`, аудио `/listen`, мир `/wiki`, анализ `/analysis`, пересказ `/summary`;
 * всё остальное (автор, каталог, внешний сайт) счётчик не считает. Абсолютный адрес разбирается
 * по пути, а не по хосту: внутренние ссылки страниц - относительные.
 */
export function classifyWorldHref(href: string | null | undefined): WorldLinkEvent | null {
  if (!href) return null;
  const section = BOOK_SECTION_PATH.exec(href.split(/[?#]/)[0])?.[1];
  return section && Object.hasOwn(SECTION_EVENTS, section) ? SECTION_EVENTS[section] : null;
}
