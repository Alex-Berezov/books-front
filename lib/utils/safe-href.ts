/**
 * Ссылка из данных API рендерится только со схемой `http:`/`https:` (`LEGACY-447`).
 *
 * Поле вроде `wikipediaUrl` или вложения претензии пишет контент-менеджер, и `javascript:…`
 * в `href` исполнится на нашем домене по клику посетителя или админа. Схема берётся
 * разбором `new URL` — так же, как её прочтёт браузер: пробелы по краям, регистр и
 * управляющие символы внутри `java\tscript:` его не обманут.
 *
 * Нестрогая проверка нарочно: это рендер, а не форма. Строгое зеркало валидатора бэкенда —
 * `isAbsoluteHttpUrl` (`http-url.ts`).
 */
export function isSafeHref(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
