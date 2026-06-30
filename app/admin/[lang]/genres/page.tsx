import { CategoryTree } from '@/components/admin/categories/CategoryTree/CategoryTree';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Genres Management',
  description: 'Manage genres in the admin panel',
};

/**
 * Genres management page (admin panel)
 */
export default function GenresPage() {
  return <CategoryTree type="genre" />;
}
