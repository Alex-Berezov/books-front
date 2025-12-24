import { CategoryList } from '@/components/admin/categories/CategoryList';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

interface CategoriesPageProps {
  params: {
    lang: SupportedLang;
  };
}

export const metadata: Metadata = {
  title: 'Categories Management',
  description: 'Manage categories in the admin panel',
};

/**
 * Categories management page (admin panel)
 */
export default function CategoriesPage(props: CategoriesPageProps) {
  const { params } = props;

  return <CategoryList lang={params.lang} />;
}
