import type { MediaFile, MediaType } from '@/types/api-schema/media';

export interface MediaSelectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when a file is selected */
  onSelect: (file: MediaFile) => void;
  /** Currently selected file URL (to show as selected) */
  initialSelectedUrl?: string;
  /**
   * Restricts both the library listing and the upload tab to these types.
   * Omit it and every kind of media is offered.
   */
  allowedTypes?: MediaType[];
}
