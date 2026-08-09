import { buildLangPath, httpGet } from '@/lib/http';
import type { SupportedLang } from '@/types/api-schema';

/**
 * Куда вёл адрес, которого больше нет (LEGACY-062).
 *
 * Слаг таксономии — индексируемый публичный URL, и до появления истории слагов его
 * смена превращала прежний адрес в 404: накопленные поисковые сигналы никуда не
 * переносились, внешние ссылки ломались, а заметно это становилось через недели.
 *
 * 🔴 **Спрашивать только тогда, когда сущность не нашлась.** Живая страница всегда
 * важнее записи в истории: слаг, освобождённый и занятый заново другим термином,
 * иначе увёл бы посетителя со страницы, которая существует. Порядок «сначала
 * попробовать отдать страницу, и лишь потом смотреть историю» — не оптимизация,
 * а условие корректности.
 */
export type RetiredSlugEntityType = 'category' | 'tag' | 'book' | 'author';

interface SlugRedirectResponse {
  newSlug: string | null;
}

export async function resolveRetiredSlug(
  entityType: RetiredSlugEntityType,
  lang: SupportedLang,
  slug: string
): Promise<string | null> {
  if (!slug) return null;

  try {
    const params = new URLSearchParams({ entityType, slug });
    const endpoint = buildLangPath(lang, `/slug-redirect?${params.toString()}`);
    const response = await httpGet<SlugRedirectResponse>(endpoint, { language: lang });
    return response?.newSlug ?? null;
  } catch {
    // Отказ этого запроса не должен превращать 404 во что-то другое: страница и так
    // уже не нашлась, и единственная потеря — редирект, которого могло и не быть.
    // Бросить исключение здесь означало бы отдать 5xx там, где честный ответ 404.
    return null;
  }
}
