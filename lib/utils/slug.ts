/**
 * Утилиты для работы со slug
 *
 * Slug - это URL-friendly строка, используемая в адресах страниц.
 * Правила:
 * - Только строчные латинские буквы, цифры и дефисы
 * - Без пробелов, спецсимволов, диакритических знаков
 * - Кириллица транслитерируется в латиницу
 */

/**
 * Мапа транслитерации кириллицы в латиницу (русский + украинский)
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  // Русский алфавит
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',

  // Украинский алфавит (дополнительные символы)
  і: 'i',
  ї: 'yi',
  є: 'ye',
  ґ: 'g',

  // Верхний регистр (будет приведен к lowercase, но на всякий случай)
  А: 'a',
  Б: 'b',
  В: 'v',
  Г: 'g',
  Д: 'd',
  Е: 'e',
  Ё: 'yo',
  Ж: 'zh',
  З: 'z',
  И: 'i',
  Й: 'y',
  К: 'k',
  Л: 'l',
  М: 'm',
  Н: 'n',
  О: 'o',
  П: 'p',
  Р: 'r',
  С: 's',
  Т: 't',
  У: 'u',
  Ф: 'f',
  Х: 'h',
  Ц: 'ts',
  Ч: 'ch',
  Ш: 'sh',
  Щ: 'shch',
  Ъ: '',
  Ы: 'y',
  Ь: '',
  Э: 'e',
  Ю: 'yu',
  Я: 'ya',
  І: 'i',
  Ї: 'yi',
  Є: 'ye',
  Ґ: 'g',
};

/**
 * Транслитерирует кириллические символы в латинские
 *
 * @param text - Исходный текст с кириллицей
 * @returns Текст с транслитерированными символами
 *
 * @example
 * transliterate('Привет мир'); // 'Privet mir'
 * transliterate('Київ'); // 'Kyiv'
 */
const transliterate = (text: string): string => {
  return text
    .split('')
    .map((char) => TRANSLITERATION_MAP[char] || char)
    .join('');
};

/**
 * Генерирует URL-friendly slug из произвольного текста
 *
 * Алгоритм:
 * 1. Транслитерирует кириллицу в латиницу
 * 2. Приводит к нижнему регистру
 * 3. Убирает диакритические знаки (ñ → n, é → e, etc.)
 * 4. Заменяет пробелы и underscore на дефисы
 * 5. Удаляет все спецсимволы кроме букв, цифр и дефисов
 * 6. Убирает множественные дефисы подряд
 * 7. Убирает дефисы в начале и конце
 *
 * @param text - Исходный текст (title, название, etc.)
 * @returns URL-friendly slug
 *
 * @example
 * generateSlug('About Us'); // 'about-us'
 * generateSlug('Война и мир'); // 'voyna-i-mir'
 * generateSlug('Café París'); // 'cafe-paris'
 * generateSlug('Hello   World!!!'); // 'hello-world'
 * generateSlug('___test___'); // 'test'
 */
export const generateSlug = (text: string): string => {
  return (
    transliterate(text)
      // Приводим к lowercase
      .toLowerCase()
      // Убираем диакритические знаки (normalize + regex)
      // NFD разбивает символы с диакритикой на базовый символ + диакритику
      // \u0300-\u036f - это unicode range для combining diacritical marks
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Заменяем пробелы и underscore на дефисы
      .replace(/[\s_]+/g, '-')
      // Удаляем все, кроме букв, цифр и дефисов
      .replace(/[^a-z0-9-]/g, '')
      // Убираем множественные дефисы подряд
      .replace(/-+/g, '-')
      // Убираем дефисы в начале и конце
      .replace(/^-+|-+$/g, '')
  );
};

/**
 * Генерирует уникальный slug с числовым суффиксом
 *
 * Добавляет суффикс -2, -3, ... к slug если оригинальный занят.
 * Используется WordPress-подобная логика.
 *
 * @param baseSlug - Базовый slug (без суффикса)
 * @param existingSlugs - Массив уже существующих slug'ов
 * @returns Уникальный slug с суффиксом (или без, если не требуется)
 *
 * @example
 * makeUniqueSlug('about', ['about']); // 'about-2'
 * makeUniqueSlug('about', ['about', 'about-2']); // 'about-3'
 * makeUniqueSlug('about', []); // 'about' (без суффикса)
 */
export const makeUniqueSlug = (baseSlug: string, existingSlugs: string[]): string => {
  // Если slug свободен, возвращаем как есть
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Ищем первый свободный номер
  let suffix = 2;
  let candidateSlug = `${baseSlug}-${suffix}`;

  while (existingSlugs.includes(candidateSlug)) {
    suffix++;
    candidateSlug = `${baseSlug}-${suffix}`;
  }

  return candidateSlug;
};

/**
 * Извлекает базовый slug без числового суффикса
 *
 * @param slug - Slug с возможным суффиксом
 * @returns Базовый slug без суффикса
 *
 * @example
 * getBaseSlug('about'); // 'about'
 * getBaseSlug('about-2'); // 'about'
 * getBaseSlug('my-page-3'); // 'my-page'
 * getBaseSlug('test-page-hello-2'); // 'test-page-hello'
 */
export const getBaseSlug = (slug: string): string => {
  // Удаляем суффикс вида "-2", "-3", etc. в конце строки
  return slug.replace(/-\d+$/, '');
};

/**
 * Проверяет, является ли slug валидным
 *
 * Правила валидации:
 * - Только строчные латинские буквы (a-z)
 * - Цифры (0-9)
 * - Дефисы (-)
 * - Не может начинаться или заканчиваться дефисом
 * - Не может содержать множественные дефисы подряд
 * - Минимум 1 символ
 *
 * @param slug - Проверяемый slug
 * @returns true если slug валиден
 *
 * @example
 * isValidSlug('about-us'); // true
 * isValidSlug('About-Us'); // false (верхний регистр)
 * isValidSlug('about--us'); // false (двойной дефис)
 * isValidSlug('-about'); // false (начинается с дефиса)
 * isValidSlug(''); // false (пустой)
 */
export const isValidSlug = (slug: string): boolean => {
  if (!slug || slug.length === 0) {
    return false;
  }

  // Проверяем формат через regex
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};
