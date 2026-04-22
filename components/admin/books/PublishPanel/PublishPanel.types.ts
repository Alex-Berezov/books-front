import type { PublicationStatus } from '@/types/api-schema';

export interface PublishPanelProps {
  /** Book version ID */
  versionId: string;
  /** Current version status */
  status: PublicationStatus;
  /**
   * If provided (non-empty), publishing is blocked and the reason is shown
   * in the panel as a warning. Used e.g. for audio versions that have no
   * audio chapters yet.
   */
  publishBlockedReason?: string | null;
  /** Callback on successful publish */
  onPublishSuccess?: () => void;
  /** Callback on successful unpublish */
  onUnpublishSuccess?: () => void;
}
