import { notFound, permanentRedirect } from 'next/navigation';
import { getBookOverview } from '@/api/endpoints/public';
import { resolveRetiredSlug } from '@/lib/seo/retired-slug';
import { handleContentFailure, isNotFoundError } from '@/lib/utils/content-failure';
import { logError } from '@/lib/utils/log-error';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';

/**
 * Разрешение книги для подмаршрутов книги: читалки, плеера и саммари (LEGACY-084).
 *
 * До 06.09.2026 эти три страницы не делали ни одного серверного запроса, поэтому
 * честного 404 у них не было вовсе: переименованная и никогда не существовавшая
 * книга доезжали до клиентского компонента и показывались тем же экраном, что и
 * книга, у которой просто нет текстовой или аудио версии — HTTP 200 во всех трёх
 * случаях.
 *
 * 🔴 Общая функция, а не три копии в трёх `page.tsx`, — потому что шагов здесь
 * четыре, и пропуск любого из них не виден на глаз. Первая редакция правки как раз
 * пропустила историю слагов во всех трёх копиях сразу: `/{lang}/book/{старый}`
 * отдавал 308 на преемника, а `/{lang}/book/{старый}/read` — глухой 404, который
 * вдобавок оседал в кэше маршрута на `revalidate` из `getBookOverview`.
 *
 * 🔴 Историю спрашиваем ТОЛЬКО после того, как попытка отдать живую книгу
 * провалилась, и на обоих путях к отсутствию: и когда API ответил 404, и когда он
 * вернул вырожденный пустой ответ. Закрытие одного пути даёт редирект «через раз»,
 * в зависимости от того, каким способом API сообщил об отсутствии, — разбор
 * в `lib/seo/retired-slug.ts` и в `app/[lang]/book/[slug]/page.tsx`.
 *
 * Отказ, который не является 404, наверх пробрасывается: «не удалось выяснить» — это
 * 5xx, а не «книги нет». 404 кэшируется как страница, 5xx не кэширует никто.
 */
export async function resolveBookForSubroute(
  lang: SupportedLang,
  slug: string,
  /** Адрес того же подмаршрута для другого слага: `(slug) => `/${lang}/book/${slug}/read``. */
  buildUrl: (bookSlug: string) => string
): Promise<BookOverview> {
  const redirectToSuccessor = async (): Promise<never> => {
    const retired = await resolveRetiredSlug('book', lang, slug);
    if (retired && retired !== slug) {
      permanentRedirect(buildUrl(retired));
    }
    notFound();
  };

  const book = await getBookOverview(lang, slug).catch(async (error) => {
    logError('Error resolving book for subroute:', error);
    if (isNotFoundError(error)) return redirectToSuccessor();
    return handleContentFailure(error, notFound);
  });

  if (!book) return redirectToSuccessor();

  return book;
}
