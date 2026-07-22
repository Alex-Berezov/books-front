import { cache } from 'react';
import { getBookOverview, resolveSeo } from '@/api/endpoints/public';
import type { SupportedLang } from '@/lib/i18n/lang';

export const getCachedBookOverview = cache((lang: SupportedLang, slug: string) =>
  getBookOverview(lang, slug)
);

export const getCachedBookSeo = cache((lang: SupportedLang, slug: string) =>
  resolveSeo(lang, 'book', slug)
);
