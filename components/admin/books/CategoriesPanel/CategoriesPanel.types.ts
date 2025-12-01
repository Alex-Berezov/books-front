import type { Category } from '@/types/api-schema';

export interface CategoriesPanelProps {
  /** Book version ID */
  versionId: string;
  /** Current attached categories */
  selectedCategories: Category[];
  /** Callback on categories change */
  onCategoriesChange?: () => void;
}
