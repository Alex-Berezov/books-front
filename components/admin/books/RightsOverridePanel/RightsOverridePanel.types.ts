import type { PublicationStatus } from '@/types/api-schema';

export interface RightsOverridePanelProps {
  bookId: string;
  versionId: string;
  status: PublicationStatus;
}
