/**
 * Номер из адреса - главы читалки (`?chapter=N`) и раздела пересказа (`/summary/{n}`): целое ≥ 1
 * записью без знаков и нулей впереди, не длиннее шести цифр. Остальное (`abc`, `0`, `01`, `1.5`,
 * `-1`, пусто) - `null`. Правило одно на сайт (F04 `tech.md` T3): его копия на бэкенде -
 * `SECTION_NUMBER_PATTERN` в `book-summary-sections.service.ts`, набор случаев у них общий.
 */
const ORDINAL_PATTERN = /^[1-9]\d{0,5}$/;

export function parseOrdinal(raw: string | null | undefined): number | null {
  if (typeof raw !== 'string' || !ORDINAL_PATTERN.test(raw)) return null;
  return Number(raw);
}
