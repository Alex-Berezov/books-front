import { CategoryTree } from '@/components/admin/categories/CategoryTree/CategoryTree';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categories Management',
  description: 'Manage categories in the admin panel',
};

/**
 * Categories management page (admin panel)
 */
export default function CategoriesPage() {
  return <CategoryTree />;
}
