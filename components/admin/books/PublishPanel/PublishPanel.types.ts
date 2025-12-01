import type { PublicationStatus } from '@/types/api-schema';

export interface PublishPanelProps {
  /** Book version ID */
  versionId: string;
  /** Current version status */
  status: PublicationStatus;
  /** Callback on successful publish */
  onPublishSuccess?: () => void;
  /** Callback on successful unpublish */
  onUnpublishSuccess?: () => void;
}
