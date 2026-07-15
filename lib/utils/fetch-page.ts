import type { SupportedLang } from '@/lib/i18n/lang';
import type { PageResponse } from '@/types/api-schema';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export async function fetchPageBySlug(
  lang: SupportedLang,
  slug: string
): Promise<PageResponse | null> {
  try {
    const url = `${API_BASE}/${lang}/pages/${slug}`;
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { 'Accept-Language': lang },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
