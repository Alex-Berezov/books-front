import { pickBookHeroes } from '@/lib/book-world/format';
import {
  buildLinkIndex,
  createLinkSession,
  entityHrefByName,
  type ChapterRule,
  type LinkSession,
} from '@/lib/book-world/link-entities';
import { isRightsBlockedError } from '@/lib/errors';
import { worldPageSlug } from '@/lib/seo/book-world';
import { noteDegraded } from '@/lib/seo/degraded';
import { versionHasWorld, worldEntityPath } from '@/lib/seo/world-path';
import { isNotFoundError } from '@/lib/utils/content-failure';
import { logError } from '@/lib/utils/log-error';
import type { BookOverview, BookWorldListEntity, VersionPreview } from '@/types/api-schema';
import { getCachedBookWorld } from './wiki/wikiData';

/**
 * Адрес страницы сущности мира для подстраниц книги (F08-5): одно место на ссылки в тексте,
 * блок «Герои книги» и «Подробнее о герое» на странице книги.
 */
export function worldEntityHref(lang: string, worldSlug: string, key: string): string {
  return `/${lang}${worldEntityPath(worldSlug, key)}`;
}

/** Ссылки и блок «Герои книги» выпали на весь срок кэша страницы - счёт деградаций, как у оглавления. */
function noteLinksDropped(version: VersionPreview, message: string, error: unknown): void {
  logError(message, error);
  noteDegraded({
    surface: 'book-world',
    reason: 'bundle-unreadable',
    lang: version.language,
    slug: version.slug ?? undefined,
    outcome: 'dropped-block',
  });
}

/**
 * Перелинковка страницы (F08-5, `product.md` §11): публичный список мира той же версии. Версии нет
 * или у неё нет мира (счётчик обзора) - запроса нет; отказ ручки или ответ не той формы - страница
 * без ссылок, не 404 (п.5): блок деградирует, отказ виден в журнале. 404 и 451 ручки - это «списка
 * нет» (мир скрыт или закрыт по правам), а не поломка: тихий `[]` без счёта деградаций. Никогда не отклоняется, поэтому
 * страница может начать загрузку до основного запроса и дождаться её после.
 */
export async function loadLinkEntities(
  version: VersionPreview | null
): Promise<BookWorldListEntity[]> {
  if (!version || !versionHasWorld(version)) return [];
  try {
    const world = await getCachedBookWorld(version.id);
    if (Array.isArray(world?.entities)) return world.entities;
    // Счётчик обзора обещает мир, а списка в ответе нет - схема разошлась, а не «мира нет».
    noteLinksDropped(
      version,
      'Book world for cross-links carries no entities list:',
      new Error(`World of version "${version.id}" carries no entities`)
    );
  } catch (error) {
    if (isNotFoundError(error) || isRightsBlockedError(error)) return [];
    noteLinksDropped(version, 'Error loading book world for cross-links:', error);
  }
  return [];
}

interface LinkSessionInput {
  lang: string;
  book: Pick<BookOverview, 'slug' | 'bookSlug'>;
  version: Pick<VersionPreview, 'slug'>;
  routeSlug: string;
  chapter?: ChapterRule | null;
  selfKey?: string;
}

/**
 * Сессия ссылок одной страницы. Ограничение (решение арбитра `F08 | F08-5b` Q9; держать в F08-10 и
 * F08-13): сессия создаётся в `page.tsx` на каждый рендер и передаётся вниз пропом `links` до
 * `Paragraphs`/`LinkedText`. Между `page.tsx` и `Paragraphs` не должно быть async-компонентов:
 * «первое упоминание» - это порядок рендера, а он совпадает с порядком документа, только пока
 * цепочка синхронна.
 */
export function makeLinkSession(
  input: LinkSessionInput & { entities: readonly BookWorldListEntity[] }
): LinkSession {
  const slug = worldPageSlug(input.version, input.book, input.routeSlug);
  const index = buildLinkIndex(
    input.entities,
    (key) => worldEntityHref(input.lang, slug, key),
    input.chapter
  );
  return createLinkSession(index, { selfKey: input.selfKey });
}

/**
 * Мир на странице книги: герои блока «Герои книги» и «Подробнее о герое» у карточек героев версии
 * по имени (решения арбитра `F08 | F08-5` Q3 и `F08 | F08-5b` Q3, круг 3). Однозначность имени - по
 * всем сущностям списка: ссылка, только если единственный владелец формы - герой со страницей.
 */
export function buildBookPageWorld(input: {
  lang: string;
  worldSlug: string;
  entities: readonly BookWorldListEntity[];
  /** Персонажи версии - Json: у старых записей (до `LEGACY-402`) имени может не быть. */
  characters: readonly { name?: unknown }[];
}): { heroes: BookWorldListEntity[]; characterPages: Record<string, string> } {
  const index = buildLinkIndex(input.entities, (key) =>
    worldEntityHref(input.lang, input.worldSlug, key)
  );
  const characterPages: Record<string, string> = {};
  for (const { name } of input.characters) {
    // Не строка - карточка без ссылки, а не TypeError и 500 страницы книги.
    if (typeof name !== 'string') continue;
    const href = entityHrefByName(index, name, 'character');
    if (href) characterPages[name] = href;
  }
  return { heroes: pickBookHeroes(input.entities), characterPages };
}
