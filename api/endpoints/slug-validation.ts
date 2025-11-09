/**
 * Slug Validation API
 *
 * Временная реализация проверки уникальности slug через существующий API.
 * TODO: Когда backend добавит специальный endpoint для проверки уникальности,
 * заменить на прямой вызов `/api/admin/:lang/pages/check-slug?slug=...`
 */

import { getPages } from '@/api/endpoints/admin';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Результат проверки уникальности slug
 */
export interface SlugValidationResult {
  /** Проверяемый slug */
  slug: string;
  /** Является ли slug уникальным */
  isUnique: boolean;
  /** Предлагаемый уникальный slug (если текущий занят) */
  suggestedSlug?: string;
  /** Существующая страница с таким slug (если найдена) */
  existingPage?: {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'archived';
  };
}

/**
 * Проверяет уникальность slug для страниц (Pages)
 *
 * ВРЕМЕННАЯ РЕАЛИЗАЦИЯ: Использует getPages() для поиска.
 * Это не оптимально, т.к. загружает весь список страниц.
 *
 * TODO: Заменить на backend endpoint когда он будет готов:
 * GET /api/admin/:lang/pages/check-slug?slug=about-us
 *
 * @param slug - Проверяемый slug
 * @param lang - Язык страницы
 * @param excludePageId - ID страницы, которую нужно исключить из проверки (при редактировании)
 * @returns Результат проверки уникальности
 *
 * @example
 * // При создании новой страницы
 * const result = await checkPageSlugUniqueness('about-us', 'en');
 * if (!result.isUnique) {
 *   console.log(`Slug занят! Используйте: ${result.suggestedSlug}`);
 * }
 *
 * @example
 * // При редактировании существующей страницы
 * const result = await checkPageSlugUniqueness('about-us', 'en', 'current-page-id');
 * // Исключит текущую страницу из проверки
 */
export const checkPageSlugUniqueness = async (
  slug: string,
  lang: SupportedLang,
  excludePageId?: string
): Promise<SlugValidationResult> => {
  try {
    // Получаем все страницы для этого языка с поиском по slug
    // TODO: Это временное решение. Backend должен добавить endpoint для проверки slug
    const response = await getPages({
      search: slug,
      lang,
      limit: 100, // На всякий случай берём больше, но реально будет 0-2 результата
    });

    // Ищем точное совпадение slug (поиск может вернуть похожие результаты)
    const existingPage = response.data.find(
      (page) => page.slug === slug && page.id !== excludePageId
    );

    if (!existingPage) {
      return {
        slug,
        isUnique: true,
      };
    }

    // Slug занят - генерируем предложение с суффиксом
    // Собираем все существующие slug'и с этим базовым slug
    const allSlugs = response.data.map((page) => page.slug);

    // Ищем первый свободный номер
    let suffix = 2;
    let suggestedSlug = `${slug}-${suffix}`;

    while (allSlugs.includes(suggestedSlug)) {
      suffix++;
      suggestedSlug = `${slug}-${suffix}`;
    }

    return {
      slug,
      isUnique: false,
      suggestedSlug,
      existingPage: {
        id: existingPage.id,
        title: existingPage.title,
        status: existingPage.status,
      },
    };
  } catch (error) {
    // В случае ошибки (например, нет авторизации) считаем slug уникальным
    // чтобы не блокировать форму
    console.error('[checkPageSlugUniqueness] Error checking slug:', error);
    return {
      slug,
      isUnique: true,
    };
  }
};

/**
 * Проверяет уникальность slug для книг (Books)
 *
 * TODO: Реализовать когда backend добавит endpoint для проверки slug книг
 * GET /api/admin/books/check-slug?slug=harry-potter
 *
 * @param slug - Проверяемый slug
 * @param _excludeBookId - ID книги, которую нужно исключить из проверки (при редактировании)
 * @returns Результат проверки уникальности
 */
export const checkBookSlugUniqueness = async (
  slug: string,
  _excludeBookId?: string
): Promise<SlugValidationResult> => {
  // TODO: Реализовать когда появится backend endpoint
  console.warn('[checkBookSlugUniqueness] Not implemented yet. Backend endpoint needed.');
  return {
    slug,
    isUnique: true,
  };
};
