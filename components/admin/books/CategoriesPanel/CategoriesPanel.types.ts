import type { Category, CategoryType } from '@/types/api-schema';

export interface CategoriesPanelProps {
  /** Book version ID */
  versionId: string;
  /** Current attached categories */
  selectedCategories: Category[];
  /** Callback on categories change */
  onCategoriesChange?: () => void;
  /** Filter by category type */
  type?: CategoryType;
}
