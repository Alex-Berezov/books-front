/**
 * Slug utilities
 *
 * Slug is a URL-friendly string used in page addresses.
 * Rules:
 * - Only lowercase Latin letters, numbers and hyphens
 * - No spaces, special characters, diacritical marks
 * - Cyrillic is transliterated to Latin
 */

/**
 * Cyrillic to Latin transliteration map (Russian + Ukrainian)
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  // Russian alphabet
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

  // Ukrainian alphabet (additional characters)
  і: 'i',
  ї: 'yi',
  є: 'ye',
  ґ: 'g',

  // Uppercase (will be converted to lowercase, but just in case)
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
 * Transliterates Cyrillic characters to Latin
 *
 * @param text - Source text with Cyrillic
 * @returns Text with transliterated characters
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
 * Generates URL-friendly slug from arbitrary text
 *
 * Algorithm:
 * 1. Transliterates Cyrillic to Latin
 * 2. Converts to lowercase
 * 3. Removes diacritical marks (ñ → n, é → e, etc.)
 * 4. Replaces spaces and underscores with hyphens
 * 5. Removes all special characters except letters, numbers and hyphens
 * 6. Removes multiple consecutive hyphens
 * 7. Removes hyphens at the beginning and end
 *
 * @param text - Source text (title, name, etc.)
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
      // Convert to lowercase
      .toLowerCase()
      // Remove diacritical marks (normalize + regex)
      // NFD splits characters with diacritics into base character + diacritic
      // \u0300-\u036f is the unicode range for combining diacritical marks
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove everything except letters, numbers and hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove hyphens at the beginning and end
      .replace(/^-+|-+$/g, '')
  );
};

/**
 * Generates unique slug with numeric suffix
 *
 * Adds suffix -2, -3, ... to slug if original is taken.
 * Uses WordPress-like logic.
 *
 * @param baseSlug - Base slug (without suffix)
 * @param existingSlugs - Array of existing slugs
 * @returns Unique slug with suffix (or without, if not required)
 *
 * @example
 * makeUniqueSlug('about', ['about']); // 'about-2'
 * makeUniqueSlug('about', ['about', 'about-2']); // 'about-3'
 * makeUniqueSlug('about', []); // 'about' (no suffix)
 */
export const makeUniqueSlug = (baseSlug: string, existingSlugs: string[]): string => {
  // If slug is available, return as is
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Find first available number
  let suffix = 2;
  let candidateSlug = `${baseSlug}-${suffix}`;

  while (existingSlugs.includes(candidateSlug)) {
    suffix++;
    candidateSlug = `${baseSlug}-${suffix}`;
  }

  return candidateSlug;
};

/**
 * Extracts base slug without numeric suffix
 *
 * @param slug - Slug with possible suffix
 * @returns Base slug without suffix
 *
 * @example
 * getBaseSlug('about'); // 'about'
 * getBaseSlug('about-2'); // 'about'
 * getBaseSlug('my-page-3'); // 'my-page'
 * getBaseSlug('test-page-hello-2'); // 'test-page-hello'
 */
export const getBaseSlug = (slug: string): string => {
  // Remove suffix like "-2", "-3", etc. at the end of string
  return slug.replace(/-\d+$/, '');
};

/**
 * Checks if slug is valid
 *
 * Validation rules:
 * - Only lowercase Latin letters (a-z)
 * - Numbers (0-9)
 * - Hyphens (-)
 * - Cannot start or end with hyphen
 * - Cannot contain multiple consecutive hyphens
 * - Minimum 1 character
 *
 * @param slug - Slug to validate
 * @returns true if slug is valid
 *
 * @example
 * isValidSlug('about-us'); // true
 * isValidSlug('About-Us'); // false (uppercase)
 * isValidSlug('about--us'); // false (double hyphen)
 * isValidSlug('-about'); // false (starts with hyphen)
 * isValidSlug(''); // false (empty)
 */
export const isValidSlug = (slug: string): boolean => {
  if (!slug || slug.length === 0) {
    return false;
  }

  // Check format via regex
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};
