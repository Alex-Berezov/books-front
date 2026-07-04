import { CategoryTree } from '@/components/admin/categories/CategoryTree/CategoryTree';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collections Management',
  description: 'Manage collections in the admin panel',
};

export default function CollectionsPage() {
  return <CategoryTree type="collection" />;
}
