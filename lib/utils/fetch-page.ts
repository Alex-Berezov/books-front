import type { SupportedLang } from '@/lib/i18n/lang';
import type { SystemPageKey } from '@/lib/system-pages';
import type { PageResponse } from '@/types/api-schema';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

async function fetchPage(lang: SupportedLang, path: string): Promise<PageResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/${lang}/${path}`, {
      next: { revalidate: 300 },
      headers: { 'Accept-Language': lang },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Хаб таксономии, найденный по неизменяемому ключу, а не по слагу (см.
 * `lib/system-pages.ts` — там же, почему слаг для этого не годился).
 *
 * ⚠️ `null` вместо ошибки — осознанно: SEO-контент хаба ценен, но страница без
 * него работает на словарных строках. Ронять весь маршрут из-за недоступного
 * CMS-блока значило бы менять потерю текста на 500.
 */
export async function fetchPageBySystemKey(
  lang: SupportedLang,
  systemKey: SystemPageKey
): Promise<PageResponse | null> {
  return fetchPage(lang, `pages/by-key/${systemKey}`);
}
