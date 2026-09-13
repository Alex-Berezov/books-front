import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/constants/cache';
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

/**
 * 🔴 `LEGACY-369`. Режим кэша здесь обязателен. Next 14 кэширует `fetch` без явного
 * режима навсегда (`force-cache`, `revalidate = false`), и `dynamic = 'force-dynamic'`
 * на странице этого не снимает — перезапускается обработчик, а `fetch` под ним
 * продолжает отвечать из кэша данных. Поэтому разовый запрос слага, которого тогда
 * ещё не было, оседал ответом `{ newSlug: null }` до конца жизни развёртывания:
 * книга позже выходила под этим слагом и переименовывалась, история X -> Y на бэкенде
 * была, а этот вызов продолжал отвечать «преемника нет» — глухой 404 там, где положен 308.
 */
export async function resolveRetiredSlug(
  entityType: RetiredSlugEntityType,
  lang: SupportedLang,
  slug: string
): Promise<string | null> {
  if (!slug) return null;

  try {
    const params = new URLSearchParams({ entityType, slug });
    const endpoint = buildLangPath(lang, `/slug-redirect?${params.toString()}`);
    const response = await httpGet<SlugRedirectResponse>(endpoint, {
      language: lang,
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    });
    return response?.newSlug ?? null;
  } catch {
    // Отказ этого запроса не должен превращать 404 во что-то другое: страница и так
    // уже не нашлась, и единственная потеря — редирект, которого могло и не быть.
    // Бросить исключение здесь означало бы отдать 5xx там, где честный ответ 404.
    return null;
  }
}
