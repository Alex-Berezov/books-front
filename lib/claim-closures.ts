/**
 * Закрытие разделов пересказа по главам (`/{lang}/book/{slug}/summary/{n}`, F04-3) блоком
 * окончённой претензии **на весь мир**. Блок по стране не закрывает ни разделы, ни анализ нигде,
 * включая страну блока; анализ, краткий и полный пересказ не закрывает и блок на весь мир (правило
 * владельца 07.11.2026, решение арбитра `T163 | LEGACY-490`). Страну посетителя закрытие не читает.
 *
 * Статичная страница раздела закрывается и сама (451 ручки - 404), а middleware отдаёт 451 сразу,
 * не дожидаясь пересборки ISR, - по списку `GET analyses/claim-closures` (строится по блоку текста,
 * имя пути историческое, решение арбитра `F04 | F04-3`). Бэкенд отдаёт в списке только блоки на
 * весь мир; страновые отбрасываются и здесь - на случай отката тега бэкенда.
 *
 * Правила (решение арбитра): список держится в памяти не дольше `CLOSURES_TTL_MS`; бэкенд не
 * ответил - работает последний полученный список; списка не было вовсе - страница открыта.
 */

import { fetchAnalysisClaimClosures } from '@/api/endpoints/analysis-claim-closures';
import { HTTP_STATUS } from '@/lib/http.constants';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { summarySectionClosedStrings } from '@/lib/i18n/summarySectionClosedStrings';
import { parseOrdinal } from '@/lib/utils/ordinal-param';
import type { BookAnalysisClaimClosure } from '@/types/api-schema';

export const CLOSURES_TTL_MS = 300_000;
/** Сколько ждать список: дольше - заход идёт по прежнему списку, а не висит на бэкенде. */
const FETCH_TIMEOUT_MS = 2_000;
/** Пауза после неудачной попытки: лежащий бэкенд не должен добавлять таймаут каждому заходу. */
export const RETRY_AFTER_FAILURE_MS = 30_000;

export type ClaimClosedTarget = { lang: string; slug: string };

const LANGS = SUPPORTED_LANGS.join('|');

/**
 * Адрес под закрытием - `/{lang}/book/{slug}/summary/{n}`, где `n` - номер по общему правилу T3:
 * номер правильной формы закрыт и без раздела (451 раньше 404, `product.md` §2 п.7), кривой
 * (`abc`, `01`) - 404 (решение арбитра `F04 | F04-3`). Сам `/summary`, `/summary/1/x` и `/analysis`
 * не закрываются.
 */
const CLOSED_SECTION_PATH = new RegExp(`^/(${LANGS})/book/([^/]+)/summary/([^/]+)/?$`);

/**
 * Путь с раскодированными сегментами - тем, что видит маршрутизатор Next: `/summary/%31`
 * он отдаёт разделу 1, и сверка по сырому пути пропустила бы такой адрес мимо закрытия.
 * Сегмент не раскодируется - `null` (такой адрес Next не отдаёт странице).
 */
function decodeSegments(pathname: string): string[] | null {
  try {
    return pathname.split('/').map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

export function matchClaimClosedPath(pathname: string): ClaimClosedTarget | null {
  const segments = decodeSegments(pathname);
  // Раскодированный `/` внутри сегмента (`%2F`) - не адрес страницы книги.
  if (!segments || segments.some((segment) => segment.includes('/'))) return null;
  const match = CLOSED_SECTION_PATH.exec(segments.join('/'));
  if (!match || parseOrdinal(match[3]) === null) return null;
  return { lang: match[1], slug: match[2] };
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

/** Закрывает ли блок на весь мир этот адрес; страновой блок не закрывает (`T163`). */
export function isClaimClosed(
  closures: readonly BookAnalysisClaimClosure[],
  target: ClaimClosedTarget,
  now: number = Date.now()
): boolean {
  const slug = target.slug.toLowerCase();
  return closures.some(
    (c) =>
      c.slugs.some((s) => s.toLowerCase() === slug) &&
      (c.language === null || c.language === target.lang) &&
      c.countryCode === null &&
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
 * Ответ 451 для закрытой страницы: тот же смысл, что экран читалки при 451, - без претензии,
 * заявителя и причины (ADR-012), с дорогой обратно на страницу книги. Личный и не кэшируется:
 * снятый или истёкший блок не должен держать 451 в кэше дольше списка (`CLOSURES_TTL_MS`). Оформление - статикой public/rights-blocked.css:
 * строку HTML сборка Next не видит, а инлайн-стиль и rewrite на маршрут отвергнуты (F03 | F03-4, В2).
 */
export function buildClaimClosedResponse(target: ClaimClosedTarget): Response {
  const lang = isSupportedLang(target.lang) ? target.lang : 'en';
  const dict = getDictionary(lang);
  // Заголовок и текст экрана раздела - свои, вне словаря (§5а); кнопки - из словаря.
  const strings = summarySectionClosedStrings[lang];
  const screen = {
    title: strings.summarySectionClosedTitle,
    message: strings.summarySectionClosedMessage,
  };
  const bookHref = `/${lang}/book/${encodeURIComponent(target.slug)}`;
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>${escapeHtml(screen.title)}</title>
<link rel="stylesheet" href="/rights-blocked.css">
</head>
<body>
<header class="rb-header"><a class="rb-brand" href="/${lang}">Bibliaris</a></header>
<main class="rb-main">
<h1 class="rb-title">${escapeHtml(screen.title)}</h1>
<p class="rb-message">${escapeHtml(screen.message)}</p>
<p class="rb-actions">
<a class="rb-action" href="${escapeHtml(bookHref)}">${escapeHtml(dict.rightsBlocked.backToBook)}</a>
<a class="rb-action" href="/${lang}/catalog">${escapeHtml(dict.rightsBlocked.browseCatalog)}</a>
</p>
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
