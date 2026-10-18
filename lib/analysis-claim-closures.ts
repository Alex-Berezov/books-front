/**
 * Закрытие страницы анализа в стране блока окончённой претензии (F03-2, решение арбитра
 * `F03 | F03-2`, слово владельца D7: «анализ закрыт там же, где текст»).
 *
 * Страница `/{lang}/book/{slug}/analysis` рендерится статично и страну читателя не знает: на
 * ней закрывает только блок на весь мир. Блок по стране закрывает middleware - по списку
 * `GET analyses/claim-closures` и стране посетителя из `cf-ipcountry`.
 *
 * Правила (решение арбитра): список держится в памяти не дольше `CLOSURES_TTL_MS`; бэкенд не
 * ответил - работает последний полученный список; списка не было вовсе - страница открыта;
 * страна неизвестна - закрывает только блок на весь мир (как на бэкенде).
 */

import { fetchAnalysisClaimClosures } from '@/api/endpoints/analysis-claim-closures';
import { HTTP_STATUS } from '@/lib/http.constants';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { BookAnalysisClaimClosure } from '@/types/api-schema';

export const CLOSURES_TTL_MS = 300_000;
/** Сколько ждать список: дольше - заход идёт по прежнему списку, а не висит на бэкенде. */
const FETCH_TIMEOUT_MS = 2_000;
/** Пауза после неудачной попытки: лежащий бэкенд не должен добавлять таймаут каждому заходу. */
export const RETRY_AFTER_FAILURE_MS = 30_000;

/** `/{lang}/book/{slug}/analysis` и только он: глубже `/analysis` адресов нет (D3), язык - из списка сайта. */
const ANALYSIS_PATH = new RegExp(`^/(${SUPPORTED_LANGS.join('|')})/book/([^/]+)/analysis/?$`);

export function matchAnalysisPath(pathname: string): { lang: string; slug: string } | null {
  const match = ANALYSIS_PATH.exec(pathname);
  if (!match) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  return { lang: match[1], slug };
}

type CacheState = {
  items: BookAnalysisClaimClosure[] | null;
  fetchedAt: number;
  attemptedAt: number | null;
  pending: Promise<void> | null;
};

const state: CacheState = { items: null, fetchedAt: 0, attemptedAt: null, pending: null };

/** Только для тестов: сбросить список между случаями. */
export function resetClaimClosuresCache(): void {
  state.items = null;
  state.fetchedAt = 0;
  state.attemptedAt = null;
  state.pending = null;
}

async function refresh(apiBaseUrl: string, now: number): Promise<void> {
  const body = await fetchAnalysisClaimClosures(apiBaseUrl, FETCH_TIMEOUT_MS);
  // Списка нет (сбой, таймаут, не та форма) - не «закрытий нет», а неизвестность: прежний список
  // остаётся (решение арбитра: «бэкенд не ответил - работает последний полученный список»).
  if (!body) return;
  state.items = body.items;
  state.fetchedAt = now;
}

export async function loadClaimClosures(
  apiBaseUrl: string,
  now: number = Date.now()
): Promise<BookAnalysisClaimClosure[]> {
  const fresh = state.items !== null && now - state.fetchedAt < CLOSURES_TTL_MS;
  const mayTry = state.attemptedAt === null || now - state.attemptedAt >= RETRY_AFTER_FAILURE_MS;
  if (!fresh && (mayTry || state.pending)) {
    // Один запрос на все одновременные заходы.
    if (!state.pending) {
      state.attemptedAt = now;
      state.pending = refresh(apiBaseUrl, now).finally(() => {
        state.pending = null;
      });
    }
    await state.pending;
  }
  return state.items ?? [];
}

/** Закрывает ли блок этот адрес для посетителя из `country` (`null` - страна неизвестна). */
export function isAnalysisClosed(
  closures: readonly BookAnalysisClaimClosure[],
  target: { lang: string; slug: string },
  country: string | null,
  now: number = Date.now()
): boolean {
  const slug = target.slug.toLowerCase();
  return closures.some(
    (c) =>
      c.slugs.some((s) => s.toLowerCase() === slug) &&
      (c.language === null || c.language === target.lang) &&
      (c.countryCode === null || (country !== null && c.countryCode.toUpperCase() === country)) &&
      (c.expiresAt === null || Date.parse(c.expiresAt) > now)
  );
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Ответ 451 для закрытого анализа: тот же смысл, что экран читалки при 451, - без претензии,
 * заявителя и причины (ADR-012), с дорогой обратно на страницу книги. Личный и не кэшируется:
 * посетителю из другой страны этот ответ отдавать нельзя.
 */
export function buildAnalysisClosedResponse(target: { lang: string; slug: string }): Response {
  const lang = isSupportedLang(target.lang) ? target.lang : 'en';
  const dict = getDictionary(lang);
  const bookHref = `/${lang}/book/${encodeURIComponent(target.slug)}`;
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>${escapeHtml(dict.rightsBlocked.title)}</title>
</head>
<body>
<main>
<h1>${escapeHtml(dict.rightsBlocked.title)}</h1>
<p>${escapeHtml(dict.rightsBlocked.analysisMessage)}</p>
<p><a href="${escapeHtml(bookHref)}">${escapeHtml(dict.rightsBlocked.backToBook)}</a></p>
<p><a href="/${lang}/catalog">${escapeHtml(dict.rightsBlocked.browseCatalog)}</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status: HTTP_STATUS.UNAVAILABLE_FOR_LEGAL_REASONS,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
