/**
 * Абсолютный адрес со схемой `http`/`https` — то же, что `@IsAbsoluteHttpUrl()` на бэкенде
 * (`books/src/shared/validators/absolute-http-url.decorator.ts`, `LEGACY-401`). Хост без TLD
 * допустим: адрес `LocalStorage` по умолчанию `http://localhost:5000`.
 *
 * Файл без `zod` намеренно: форма автора зовёт проверку напрямую, и импорт `zod` отсюда
 * добавлял ~30 kB в бандл трёх роутов авторов (бюджет бандла, `T75`). Поле формы на `zod` —
 * `http-url-field.ts`.
 */
export function isAbsoluteHttpUrl(value: string): boolean {
  // `new URL` мягче `isURL` из class-validator: срезает пробелы по краям, достраивает
  // `https:/x` и `https:x` до полного адреса и пускает `_` в имени хоста. Всё это бэкенд
  // отбивает 400, поэтому форма обязана отбить раньше.
  if (!/^https?:\/\/[^\s/]/i.test(value) || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.hostname !== '' && !url.hostname.includes('_');
  } catch {
    return false;
  }
}
