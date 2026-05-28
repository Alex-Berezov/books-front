import { getCategoryBooks, resolveSeo } from '@/api/endpoints/public';
import { CatalogTemplate } from '@/components/public/catalog/CatalogTemplate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string; categorySlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, categorySlug } = await params;
  const supportedLang = lang as SupportedLang;

  try {
    const categoryBooks = await getCategoryBooks(supportedLang, categorySlug, 1, 1);
    const category = categoryBooks.category;
    const catTranslation = category?.translations?.find((t) => t.language === supportedLang);
    const categoryName = catTranslation?.name || category?.id || categorySlug;

    const seo = await resolveSeo(supportedLang, 'category', category.id);

    return {
      title: seo.title || `${categoryName} Books - Bibliaris`,
      description:
        seo.description ||
        `Explore ${categoryName} books on Bibliaris. Read text versions, listen to audiobooks, and manage your shelf.`,
      keywords: seo.keywords || [],
      alternates: {
        canonical: seo.canonicalUrl || undefined,
        languages: seo.alternates || {},
      },
    };
  } catch (error) {
    console.error('Error generating metadata for category:', error);
    return {
      title: 'Catalog - Bibliaris',
    };
  }
}

export default async function CategoryCatalogPage({ params }: Props) {
  const { lang, categorySlug } = await params;
  const supportedLang = lang as SupportedLang;

  return <CatalogTemplate lang={supportedLang} categorySlug={categorySlug} />;
}
