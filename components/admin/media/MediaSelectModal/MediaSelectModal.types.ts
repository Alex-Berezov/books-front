import type { MediaFile } from '@/types/api-schema/media';

export interface MediaSelectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when a file is selected */
  onSelect: (file: MediaFile) => void;
  /** Currently selected file URL (to show as selected) */
  initialSelectedUrl?: string;
  /** Allowed media types (optional) */
  allowedTypes?: ('image' | 'video' | 'audio' | 'document')[];
}
