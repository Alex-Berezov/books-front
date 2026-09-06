import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Три формы счётного слова: один, несколько, много.
 *
 * `few` нужен только там, где язык его различает. Для четырёх языков из пяти
 * он совпадает с `many` и в словарях просто продублирован — так состав ключей
 * остаётся одинаковым во всех пяти файлах, чего требует типизация словаря
 * (`Dictionary = typeof en` в `lib/i18n/dictionaries.ts`) и
 * `__tests__/lib/i18n/localesParity.test.ts`.
 */
export interface PluralForms {
  one: string;
  few: string;
  many: string;
}

/**
 * Языки, у которых ноль идёт с формой единственного числа: `0 livre`, `0 livro`.
 *
 * ⚠️ Правило не общее: `en` и `es` при нуле берут множественное (`0 books`,
 * `0 libros`). До 06.09.2026 плюрализатор жил на хабе авторов, где счётчик нуля
 * не встречался; на карточке таксономии и на пустой полке он встречается сразу.
 */
const ZERO_IS_SINGULAR: ReadonlySet<SupportedLang> = new Set(['fr', 'pt']);

/**
 * Счётное слово по числу — общий плюрализатор словаря (`LEGACY-052`).
 *
 * 🔴 Заведено потому, что пары форм русскому не хватает. Выбор «`=== 1` или
 * всё остальное» давал «2 авторов», «3 книг», «21 авторов» — то есть неверную
 * подпись у каждого второго числа. Правило русского:
 * 1, 21, 31 — единственное; 2-4, 22-24 — родительный единственного;
 * 5-20, 25-30 — родительный множественного.
 *
 * ⚠️ `Intl.PluralRules` здесь намеренно не используется: он отдаёт **категорию**
 * (`one`/`few`/`many`/`other`), а не форму слова — ключи на язык всё равно нужны,
 * зато состав ключей перестал бы совпадать у пяти словарей (у `en` категорий две,
 * у `ru` четыре). Решение арбитра от 06.09.2026, `decisions-log.md`.
 */
export function pluralize(count: number, lang: SupportedLang, forms: PluralForms): string {
  if (lang !== 'ru') {
    if (count === 0) return ZERO_IS_SINGULAR.has(lang) ? forms.one : forms.many;
    return count === 1 ? forms.one : forms.many;
  }

  const abs = Math.abs(count) % 100;
  const tens = abs % 10;

  // Одиннадцать-четырнадцать — исключение: «11 книг», а не «11 книга».
  if (abs >= 11 && abs <= 14) return forms.many;
  if (tens === 1) return forms.one;
  if (tens >= 2 && tens <= 4) return forms.few;
  return forms.many;
}

/**
 * Тройка форм по базовому ключу словаря: `common.bookCount` →
 * `common.bookCountOne` / `...Few` / `...Many`.
 *
 * Заведён потому, что тройка выписывалась в разметке по буквам в пяти местах,
 * а промах в имени ключа `t()` не ловится ни типами, ни тестами — он печатает
 * читателю сам ключ (`lib/i18n/useTranslation.ts`).
 */
export const pluralFormsOf = (
  t: (key: string, variables?: Record<string, string | number>) => string,
  baseKey: string,
  variables?: Record<string, string | number>
): PluralForms => ({
  one: t(`${baseKey}One`, variables),
  few: t(`${baseKey}Few`, variables),
  many: t(`${baseKey}Many`, variables),
});
