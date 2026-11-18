import type { BookWorldCoPresence } from '@/types/api-schema';
import { isLinkableEntity } from './link-entities';

/**
 * Чистые правила страниц мира книги (F08-3b, `product.md` §5): без зависимостей от React и API,
 * чтобы их проверяли юнитами, а страница лишь рисовала результат.
 */

/** «Чаще всего в одних главах с» - сколько героев (решение арбитра `F08 | F08-3` Q9). */
export const WORLD_CO_PRESENCE_LIMIT = 3;

/** «Дальше» - сколько соседних героев карточками (Q9). */
export const WORLD_NEXT_LIMIT = 6;

/**
 * Соседи героя по совместному присутствию: больше общих глав - выше, при равенстве - по ключу.
 * Герой без общих глав и ключи вне `allowedKeys` (не публичные или не найденные) не попадают.
 */
export function rankCoPresence(
  coPresence: readonly BookWorldCoPresence[] | null | undefined,
  allowedKeys: ReadonlySet<string>,
  selfKey: string
): BookWorldCoPresence[] {
  return (coPresence ?? [])
    .filter((c) => c.key !== selfKey && c.chapters.length > 0 && allowedKeys.has(c.key))
    .sort((a, b) => b.chapters.length - a.chapters.length || (a.key < b.key ? -1 : 1));
}

/**
 * Этап пути из последней трети книги - помечается «спойлер» (`product.md` §5 п.8). Положение
 * считается по номерам глав версии; главы нет в версии или у версии нет глав - пометки нет.
 */
export function isLastThirdChapter(chapter: number, chapterNumbers: readonly number[]): boolean {
  const index = chapterNumbers.indexOf(chapter);
  if (index < 0 || chapterNumbers.length === 0) return false;
  return (index + 1) / chapterNumbers.length > 2 / 3;
}

/** Главы присутствия, которые есть в версии: полоса и подпись совпадают (`product.md` §5 п.6). */
export function presenceChapters(
  mentionChapters: readonly number[] | null | undefined,
  chapterNumbers: readonly number[]
): number[] {
  const existing = new Set(chapterNumbers);
  return [...new Set(mentionChapters ?? [])].filter((n) => existing.has(n)).sort((a, b) => a - b);
}

/**
 * Ранний и поздний `updatedAt` из списка дат ISO: поздний - дата подписи общей страницы (Q12), ранний -
 * дата публикации в разметке. Неразборчивые даты пропускаются; разборчивых нет - оба `null`.
 */
export function updatedAtRange(dates: readonly string[]): {
  earliest: string | null;
  latest: string | null;
} {
  let earliest: { time: number; value: string } | null = null;
  let latest: { time: number; value: string } | null = null;
  for (const value of dates) {
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) continue;
    if (!earliest || time < earliest.time) earliest = { time, value };
    if (!latest || time > latest.time) latest = { time, value };
  }
  return { earliest: earliest?.value ?? null, latest: latest?.value ?? null };
}

/**
 * Подстановка `{name}` в шаблон строки. Значение вставляется как есть: `String.replace` со строкой
 * разобрал бы в имени героя или книги `$&`, `$1` и исказил бы h1 и title.
 */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(String(value)),
    template
  );
}

/** Сколько героев в блоке «Герои книги» (`product.md` §11 п.4). */
export const WORLD_HEROES_BLOCK_LIMIT = 6;

/**
 * Герои для блока «Герои книги» (решение арбитра `F08 | F08-5` Q4): публичные герои со страницей
 * (то же правило, что у ссылок в тексте: с ядром, не строка редактора);
 * `main` первыми, затем по первой главе присутствия (пустые в конце), затем по ключу.
 */
export function pickBookHeroes<
  T extends {
    key: string;
    type: string;
    hasCore: boolean;
    role: string | null;
    mentionFirst: number | null;
    editor?: unknown;
  },
>(entities: readonly T[]): T[] {
  const rank = (e: T) => (e.role === 'main' ? 0 : 1);
  const first = (e: T) => e.mentionFirst ?? Number.POSITIVE_INFINITY;
  return entities
    .filter((e) => e.type === 'character' && isLinkableEntity(e))
    .sort(
      (a, b) =>
        rank(a) - rank(b) || first(a) - first(b) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
    )
    .slice(0, WORLD_HEROES_BLOCK_LIMIT);
}
