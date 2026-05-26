'use client';

import { CatalogTemplate } from '@/components/public/catalog/CatalogTemplate';
import type { SupportedLang } from '@/lib/i18n/lang';

type Props = {
  params: { lang: string };
};

export default function CatalogPage({ params }: Props) {
  const { lang } = params;
  return <CatalogTemplate lang={lang as SupportedLang} />;
}
