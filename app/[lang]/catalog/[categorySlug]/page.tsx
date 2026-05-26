'use client';

import { CatalogTemplate } from '@/components/public/catalog/CatalogTemplate';
import type { SupportedLang } from '@/lib/i18n/lang';

type Props = {
  params: { lang: string; categorySlug: string };
};

export default function CategoryCatalogPage({ params }: Props) {
  const { lang, categorySlug } = params;
  return <CatalogTemplate lang={lang as SupportedLang} categorySlug={categorySlug} />;
}
