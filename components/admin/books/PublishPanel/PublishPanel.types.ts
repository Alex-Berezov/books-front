import type { PublicationStatus } from '@/types/api-schema';

export interface PublishPanelProps {
  versionId: string;
  status: PublicationStatus;
  publishBlockedReason?: string | null;
  onPublishSuccess?: () => void;
  onUnpublishSuccess?: () => void;
}
