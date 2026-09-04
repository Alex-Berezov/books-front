import { noteDegraded } from '@/lib/seo/degraded';
import { buildPublicUrl, getSiteUrl } from '@/lib/seo/urls';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getBaseUrl(): string {
  return getSiteUrl();
}

export function buildUrl(path: string): string {
  return buildPublicUrl(path);
}

/**
 * Сколько книг обязан покрывать один файл `sitemap-books-{lang}-{n}.xml`.
 *
 * Это размер URL-пространства файла, а не размер одного запроса к бэкенду:
 * с 04.09.2026 (`LEGACY-298`) `GET /:lang/books` зажат `API_MAX_PAGE_SIZE`,
 * и файл набирается несколькими бэкенд-страницами через `fetchPageWindow`.
 * Экспортирована, чтобы номер файла и окно бэкенд-страниц считались от одного
 * числа, а не от двух литералов, которые молча разойдутся при следующей правке.
 */
export const BOOKS_SITEMAP_PAGE_SIZE = 1000;

/** `null` means the count could not be established — never "zero books". */
export type GetTotalBooksFn = (lang: string) => Promise<number | null>;

/**
 * Book sitemap files for the index, one language at a time.
 *
 * The failure branch used to `return []`, which removed **every** book sitemap
 * for that language from an index still served as 200 OK — the site silently
 * appeared to have lost a whole language. A 403 from the rate limiter was enough,
 * and it fires for all five languages in parallel from one request.
 *
 * This follows `sitemap-static.xml` instead, which is the correct implementation
 * of the same problem: an unknown count is kept apart from a zero count, and
 * unknown fails towards *keeping* the URL. Page 1 is emitted so the language stays
 * in the index; the per-file route decides what that page contains.
 *
 * A genuine zero still yields nothing — that is an answer, not a failure.
 */
export async function getBookSitemapUrls(
  cleanBaseUrl: string,
  supportedLangs: readonly string[],
  getTotalBooks: GetTotalBooksFn
): Promise<string[]> {
  const results = await Promise.all(
    supportedLangs.map(async (lang) => {
      const fileUrl = (index: number) =>
        `${cleanBaseUrl}/sitemaps/sitemap-books-${lang}-${index}.xml`;

      let total: number | null = null;
      try {
        total = await getTotalBooks(lang);
      } catch {
        total = null;
      }

      if (total === null || !Number.isFinite(total)) {
        noteDegraded({
          surface: 'sitemap-index',
          reason: 'count-unreadable',
          lang,
          outcome: 'kept-url',
        });
        return [fileUrl(1)];
      }

      const pages = Math.ceil(total / BOOKS_SITEMAP_PAGE_SIZE);
      return Array.from({ length: pages }, (_, index) => fileUrl(index + 1));
    })
  );
  return results.flat();
}

export interface SitemapItem {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: {
    languages?: Record<string, string>;
  };
}

export function buildSitemapIndexXml(sitemapUrls: string[]): string {
  const xmlItems = sitemapUrls.map((url) => {
    const safeUrl = escapeXml(url);
    return ['  <sitemap>', `    <loc>${safeUrl}</loc>`, '  </sitemap>'].join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems.join('\n')}
</sitemapindex>`;
}

export function buildUrlSetXml(items: SitemapItem[]): string {
  const xmlItems = items.map((item) => {
    let itemXml = '  <url>\n';
    itemXml += `    <loc>${escapeXml(item.url)}</loc>\n`;
    if (item.lastModified) {
      const dateStr =
        typeof item.lastModified === 'string'
          ? item.lastModified
          : (item.lastModified as Date).toISOString();
      itemXml += `    <lastmod>${escapeXml(dateStr)}</lastmod>\n`;
    }
    if (item.changeFrequency) {
      itemXml += `    <changefreq>${escapeXml(item.changeFrequency)}</changefreq>\n`;
    }
    if (item.priority !== undefined) {
      itemXml += `    <priority>${escapeXml(item.priority.toFixed(1))}</priority>\n`;
    }
    if (item.alternates?.languages) {
      Object.entries(item.alternates.languages).forEach(([langKey, href]) => {
        const safeLangKey = escapeXml(langKey);
        const safeHref = escapeXml(href);
        itemXml += `    <xhtml:link rel="alternate" hreflang="${safeLangKey}" href="${safeHref}" />\n`;
      });
    }
    itemXml += '  </url>';
    return itemXml;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlItems.join('\n')}
</urlset>`;
}

/**
 * Сколько строк обязана содержать **эта** страница выдачи.
 *
 * 🔴 `meta.total` — счётчик по **всей** выборке, а не по странице. Первая
 * версия детектора сравнивала с ним длину одной страницы и потому объявляла
 * усечением любую нормальную постраничную выдачу: 1000 книг на странице при
 * `total = 1500` читались как потеря 500 строк. Карта книг ушла бы в 503
 * навсегда в тот день, когда каталог перевалит за тысячу, — то есть детектор
 * неполноты сам стал бы причиной полной потери (`LEGACY-098`).
 *
 * Ожидание считается из самой `meta`: сколько строк остаётся до конца выборки
 * на этой странице, но не больше её размера.
 */
function expectedRowsOnPage(meta: PaginationLike): number | null {
  const { total, page, limit } = meta;
  if (typeof total !== 'number') return null;
  if (typeof page !== 'number' || typeof limit !== 'number' || limit <= 0) {
    // Постраничных признаков нет — считаем выдачу одностраничной.
    return total;
  }
  const remaining = total - (page - 1) * limit;
  return Math.max(0, Math.min(limit, remaining));
}

export interface PaginationLike {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface PagedResponse<T> {
  data?: T[];
  meta?: PaginationLike;
}

/**
 * Отдаёт `data` страницы, если она пришла целиком, и падает, если усечена.
 *
 * Ограничение выдачи без детектора усечения — это тихая потеря данных
 * (`LEGACY-098`): ветка карты сайта, получившая меньше строк, чем должна,
 * построит более короткий `<urlset>` с кодом 200. XML валиден, ответ успешен,
 * часть адресов просто исчезла — этого не увидит ни одна проверка.
 *
 * ⚠️ Проверяется полнота **страницы**, а не всей выборки. «Есть ещё страницы» —
 * это не усечение, а пагинация; за полноту многостраничного обхода отвечает
 * `fetchAllPages`.
 */
export function takeCompletePage<T>(
  response: PagedResponse<T> | null | undefined,
  where: string
): T[] {
  const data = response?.data ?? [];
  const expected = response?.meta ? expectedRowsOnPage(response.meta) : null;

  if (expected !== null && data.length < expected) {
    throw new Error(
      `${where}: получено ${data.length} из ${expected} на странице — выдача усечена`
    );
  }

  return data;
}

/**
 * Одна повторная попытка на страницу. Без неё единичный 429 от лимитера
 * (`LEGACY-064`: весь фронт ходит в API одним IP) ронял бы всю секцию карты в
 * 503 — потеря, несоразмерная причине. Две подряд — уже не рябь, и тогда отказ
 * честнее неполного списка. Общая для `fetchAllPages` и `fetchPageWindow`:
 * `fetchPageWindow` изначально её не унаследовал, и число запросов на файл
 * карты книг выросло с одного до десяти — та же рябь стала стоить в десять
 * раз больше шансов (найдено ревью, `LEGACY-298`).
 */
async function fetchPageWithRetry<T>(
  fetchPage: (page: number) => Promise<PagedResponse<T>>,
  page: number
): Promise<PagedResponse<T>> {
  try {
    // `await` здесь обязателен: без него отказ не попал бы в `catch`.
    return await fetchPage(page);
  } catch {
    // А здесь не нужен — оборачивающего `try` больше нет, и вторая неудача
    // должна уйти наверх как есть.
    return fetchPage(page);
  }
}

/**
 * Собирает **все** страницы выдачи и проверяет, что собрала их полностью.
 *
 * 🔴 Секции карты сайта ходили за терминами одним запросом с `limit: 1000` и
 * молча теряли всё, что за тысячу не поместилось. Детектор страницы такую
 * потерю не видит: страница-то полная. Единственный честный ответ — забрать
 * остальные страницы, а не гадать (`LEGACY-098`).
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PagedResponse<T>>,
  where: string,
  maxPages = 50
): Promise<T[]> {
  const withRetry = (page: number) => fetchPageWithRetry(fetchPage, page);

  const first = await withRetry(1);
  const items = takeCompletePage(first, `${where} p1`);
  const total = first?.meta?.total;
  const limit = first?.meta?.limit ?? items.length;
  const totalPages =
    first?.meta?.totalPages ??
    (typeof total === 'number' && limit > 0 ? Math.ceil(total / limit) : 1);

  if (totalPages > maxPages) {
    throw new Error(`${where}: страниц ${totalPages}, потолок обхода ${maxPages}`);
  }

  for (let page = 2; page <= totalPages; page += 1) {
    items.push(...takeCompletePage(await withRetry(page), `${where} p${page}`));
  }

  if (typeof total === 'number' && items.length < total) {
    throw new Error(`${where}: собрано ${items.length} из ${total} — обход неполон`);
  }

  return items;
}

/**
 * Собирает фиксированное окно из `pageCount` бэкенд-страниц подряд, начиная
 * с `firstPage`, и требует, чтобы окно оказалось цельным (`LEGACY-298`).
 *
 * От `fetchAllPages` отличается тем, где останавливается: `fetchAllPages` идёт
 * от первой страницы до конца **всей** выборки, а здесь диапазон страниц
 * фиксирован заранее — нужен там, где окно привязано к номеру файла в адресе
 * (карта книг: файл `n` обязан покрывать книги `[(n-1)*1000, n*1000)`), а не
 * к границе самой выборки. Страница короче `pageSize` останавливает обход
 * раньше срока — дальше пусто, а не молчаливый лишний запрос за пределы
 * выборки.
 *
 * Отказ или усечение любой из страниц окна бросает исключение — вызывающий
 * код (сборка файла карты) обязан считать всё окно негодным, а не отдавать
 * файл с частью URL и кодом 200. Одна повторная попытка на страницу — та же,
 * что у `fetchAllPages`: окно теперь стоит нескольких запросов вместо одного,
 * и та же рябь лимитера (`LEGACY-064`) без неё роняла бы файл во столько же
 * раз чаще.
 */
export async function fetchPageWindow<T>(
  fetchPage: (page: number) => Promise<PagedResponse<T>>,
  firstPage: number,
  pageCount: number,
  pageSize: number,
  where: string
): Promise<T[]> {
  const items: T[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    const page = firstPage + i;
    const pageItems = takeCompletePage(
      await fetchPageWithRetry(fetchPage, page),
      `${where} p${page}`
    );
    items.push(...pageItems);
    if (pageItems.length < pageSize) break;
  }
  return items;
}

/**
 * Ответ «карта временно недоступна» (`LEGACY-082`).
 *
 * 503 вместо 404 — потому что краулер читает их противоположно: 404 на файле
 * карты означает «такой карты не существует», и это снимает с индекса **все**
 * перечисленные в ней адреса разом; 503 означает «зайди позже» и индекс не
 * трогает. Цена ошибки в выборе кода умножается на число URL внутри файла.
 *
 * `Retry-After` даёт краулеру явный срок вместо угадывания, `no-store` не
 * позволяет общему кэшу закрепить временный отказ.
 */
export function sitemapUnavailable(reasons: readonly string[]): Response {
  // ⚠️ Причины — в лог, не в тело. Тело этого ответа получает кто угодно,
  // включая краулера, а в тексте ошибки API попадаются внутренние хосты,
  // фрагменты запросов и серверные сообщения. Диагностика нужна оператору,
  // а не анониму.
  console.error(`Sitemap unavailable:\n${reasons.join('\n')}`);

  return new Response('Sitemap temporarily unavailable\n', {
    status: 503,
    headers: {
      'Retry-After': '120',
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
