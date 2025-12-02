import type { Tag } from '@/types/api-schema';

/**
 * TagsPanel component props
 */
export interface TagsPanelProps {
  /** Book version ID */
  versionId: string;
  /** Current attached tags */
  selectedTags: Tag[];
  /** Callback on tags change */
  onTagsChange?: () => void;
}
