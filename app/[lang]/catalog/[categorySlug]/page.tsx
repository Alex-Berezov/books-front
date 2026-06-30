import { permanentRedirect, notFound } from 'next/navigation';
import { resolveSeo } from '@/api/endpoints/public';
import type { SupportedLang } from '@/lib/i18n/lang';

type Props = {
  params: Promise<{ lang: string; categorySlug: string }>;
};

export default async function CatalogRedirectPage({ params }: Props) {
  const { lang, categorySlug } = await params;
  const supportedLang = lang as SupportedLang;

  let categoryType: 'category' | 'genre' | null = null;

  try {
    await resolveSeo(supportedLang, 'category', categorySlug);
    categoryType = 'category';
  } catch {
    try {
      await resolveSeo(supportedLang, 'genre', categorySlug);
      categoryType = 'genre';
    } catch {
      permanentRedirect(`/${supportedLang}/catalog`);
    }
  }

  if (categoryType === 'category') {
    permanentRedirect(`/${supportedLang}/category/${categorySlug}`);
  } else if (categoryType === 'genre') {
    permanentRedirect(`/${supportedLang}/genre/${categorySlug}`);
  }

  notFound();
}
