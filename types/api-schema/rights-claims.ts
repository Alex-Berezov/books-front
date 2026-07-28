/**
 * Phase 16: Rights Claims / DMCA.
 * Mirrors the backend contract exposed under `/admin/rights/claims*`.
 */

export type RightsClaimType =
  | 'DMCA_TAKEDOWN'
  | 'COPYRIGHT_INFRINGEMENT'
  | 'LICENSE_VIOLATION'
  | 'ATTRIBUTION_MISSING'
  | 'TERRITORY_VIOLATION'
  | 'TRADEMARK'
  | 'PRIVACY_PERSONAL_DATA'
  | 'DEFAMATION'
  | 'COUNTER_NOTICE'
  | 'OTHER';

export type RightsClaimStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'AWAITING_CLAIMANT'
  | 'CONTENT_REMOVED'
  | 'CONTENT_RESTRICTED'
  | 'COUNTER_NOTICE_FILED'
  | 'ESCALATED_TO_LAWYER'
  | 'RESOLVED_VALID'
  | 'RESOLVED_INVALID'
  | 'WITHDRAWN'
  | 'CLOSED';

export type RightsClaimSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RightsClaimChannel =
  | 'EMAIL'
  | 'WEB_FORM'
  | 'POSTAL'
  | 'PHONE'
  | 'LEGAL_COUNSEL'
  | 'PLATFORM_NOTICE'
  | 'OTHER';

export type RightsClaimantType =
  | 'RIGHTS_HOLDER'
  | 'AUTHOR'
  | 'PUBLISHER'
  | 'AGENT'
  | 'LAW_FIRM'
  | 'COLLECTING_SOCIETY'
  | 'PLATFORM'
  | 'INDIVIDUAL'
  | 'UNKNOWN';

export type RightsClaimResolution =
  | 'VALID_CONTENT_REMOVED'
  | 'VALID_LICENSE_OBTAINED'
  | 'VALID_GEO_RESTRICTED'
  | 'VALID_ATTRIBUTION_ADDED'
  | 'INVALID_REJECTED'
  | 'WITHDRAWN_BY_CLAIMANT'
  | 'COUNTER_NOTICE_UPHELD'
  | 'NO_ACTION_NEEDED'
  | 'OTHER';

export type RightsClaimBlockStatus = 'ACTIVE' | 'LIFTED' | 'EXPIRED';

export type RightsClaimAttachmentType =
  | 'CLAIM_NOTICE'
  | 'EVIDENCE'
  | 'POWER_OF_ATTORNEY'
  | 'LICENSE_DOCUMENT'
  | 'CORRESPONDENCE'
  | 'COUNTER_NOTICE'
  | 'RESPONSE_LETTER'
  | 'LEGAL_OPINION'
  | 'SCREENSHOT'
  | 'OTHER';

export type RightsClaimEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNED'
  | 'BLOCK_APPLIED'
  | 'BLOCK_LIFTED'
  | 'BLOCK_EXPIRED'
  | 'RESPONSE_RECORDED'
  | 'COUNTER_NOTICE_RECORDED'
  | 'RESOLVED'
  | 'REOPENED'
  | 'ESCALATED'
  | 'DEADLINE_CHANGED'
  | 'COMPONENT_LINKED'
  | 'COMPONENT_UNLINKED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED'
  | 'VERSION_UNPUBLISHED';

/** Reuses the Phase 12 `GeoBlockScope` values. */
export type RightsClaimBlockScope =
  | 'ENTIRE_BOOK'
  | 'LANGUAGE_EDITION'
  | 'TEXT_READER'
  | 'DOWNLOADS'
  | 'AUDIO'
  | 'SPECIFIC_ASSET';

export interface RightsClaimSummary {
  id: string;
  claimNumber: string;
  claimType: RightsClaimType;
  status: RightsClaimStatus;
  severity: RightsClaimSeverity;
  channel: RightsClaimChannel;
  receivedAt: string;
  deadlineAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  claimantName: string;
  claimantType: RightsClaimantType;
  claimantOrganization: string | null;
  claimantEmail: string | null;
  claimantIsAuthorized: boolean;
  bookId: string | null;
  bookVersionId: string | null;
  rightsProfileId: string | null;
  rightsIntakeId: string | null;
  affectedCountryCodes: string[];
  affectedLanguages: string[];
  claimedWorkTitle: string | null;
  claimedWorkAuthor: string | null;
  descriptionRu: string;
  assignedToUserId: string | null;
  blocksPublication: boolean;
  requiresLawyerReview: boolean;
  resolution: RightsClaimResolution | null;
  /** Computed server-side: the status belongs to the open set. */
  isOpen: boolean;
  isOverdue: boolean;
  daysUntilDeadline: number | null;
  activeBlocksCount: number;
  hasWorldwideBlock: boolean;
  blockedCountryCodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RightsClaimComponentRef {
  id: string;
  rightsClaimId: string;
  rightsComponentId: string | null;
  componentType: string | null;
  titleRu: string | null;
  notesRu: string | null;
  createdAt: string;
}

export interface RightsClaimAccessBlock {
  id: string;
  rightsClaimId: string;
  bookId: string | null;
  bookVersionId: string | null;
  scope: RightsClaimBlockScope;
  /** null = the block applies worldwide. */
  countryCode: string | null;
  status: RightsClaimBlockStatus;
  /** Status with expiry applied at request time. */
  effectiveStatus: RightsClaimBlockStatus;
  reasonRu: string;
  appliedAt: string;
  appliedByUserId: string | null;
  expiresAt: string | null;
  liftedAt: string | null;
  liftedByUserId: string | null;
  liftReasonRu: string | null;
  createdAt: string;
}

export interface RightsClaimAttachment {
  id: string;
  rightsClaimId: string;
  attachmentType: RightsClaimAttachmentType;
  title: string;
  fileName: string | null;
  mediaAssetId: string | null;
  storageKey: string | null;
  url: string | null;
  sha256: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  notesRu: string | null;
  uploadedByUserId: string | null;
  createdAt: string;
}

export interface RightsClaimEvent {
  id: string;
  eventType: RightsClaimEventType;
  previousStatus: RightsClaimStatus | null;
  currentStatus: RightsClaimStatus | null;
  notesRu: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface RightsClaim extends RightsClaimSummary {
  claimantPhone: string | null;
  claimantAddress: string | null;
  claimantPersonId: string | null;
  mediaAssetId: string | null;
  claimedRightsDescriptionRu: string | null;
  infringingUrls: string[];
  goodFaithStatement: boolean;
  swornStatement: boolean;
  originalNoticeText: string | null;
  originalNoticeUrl: string | null;
  internalNotesRu: string | null;
  blocksPublicationOverrideReasonRu: string | null;
  responseSentAt: string | null;
  responseChannel: RightsClaimChannel | null;
  responseTextRu: string | null;
  responseByUserId: string | null;
  counterNoticeReceivedAt: string | null;
  counterNoticeClaimantName: string | null;
  counterNoticeTextRu: string | null;
  resolutionNotesRu: string | null;
  resolvedByUserId: string | null;
  parentClaimId: string | null;
  createdByUserId: string | null;
  components: RightsClaimComponentRef[];
  accessBlocks: RightsClaimAccessBlock[];
  attachments: RightsClaimAttachment[];
  events: RightsClaimEvent[];
}

export interface CreateRightsClaimRequest {
  claimType: RightsClaimType;
  severity?: RightsClaimSeverity;
  channel?: RightsClaimChannel;
  receivedAt?: string;
  deadlineAt?: string;
  claimantName: string;
  claimantType?: RightsClaimantType;
  claimantOrganization?: string;
  claimantEmail?: string;
  claimantPhone?: string;
  claimantAddress?: string;
  claimantIsAuthorized?: boolean;
  claimantPersonId?: string;
  bookId?: string;
  bookVersionId?: string;
  rightsProfileId?: string;
  rightsIntakeId?: string;
  mediaAssetId?: string;
  parentClaimId?: string;
  affectedCountryCodes?: string[];
  affectedLanguages?: string[];
  claimedWorkTitle?: string;
  claimedWorkAuthor?: string;
  claimedRightsDescriptionRu?: string;
  descriptionRu: string;
  infringingUrls?: string[];
  goodFaithStatement?: boolean;
  swornStatement?: boolean;
  originalNoticeText?: string;
  originalNoticeUrl?: string;
  assignedToUserId?: string;
  internalNotesRu?: string;
  blocksPublication?: boolean;
  blocksPublicationOverrideReasonRu?: string;
  requiresLawyerReview?: boolean;
}

export type UpdateRightsClaimRequest = Partial<CreateRightsClaimRequest>;

export interface ChangeRightsClaimStatusRequest {
  status: RightsClaimStatus;
  notesRu?: string;
}

export interface AssignRightsClaimRequest {
  assignedToUserId?: string | null;
  notesRu?: string;
}

export interface RecordClaimResponseRequest {
  responseTextRu: string;
  responseChannel?: RightsClaimChannel;
  responseSentAt?: string;
}

export interface RecordCounterNoticeRequest {
  counterNoticeTextRu: string;
  counterNoticeClaimantName?: string;
  counterNoticeReceivedAt?: string;
}

export interface ResolveRightsClaimRequest {
  resolution: RightsClaimResolution;
  resolutionNotesRu: string;
  liftActiveBlocks?: boolean;
  finalStatus?: 'RESOLVED_VALID' | 'RESOLVED_INVALID';
}

export interface ReopenRightsClaimRequest {
  reasonRu: string;
}

export interface ApplyClaimBlockRequest {
  scope: RightsClaimBlockScope;
  countryCodes?: string[];
  bookVersionId?: string;
  bookId?: string;
  reasonRu: string;
  expiresAt?: string;
  unpublishVersion?: boolean;
}

export interface LiftClaimBlockRequest {
  liftReasonRu: string;
}

export interface LinkClaimComponentRequest {
  rightsComponentId?: string;
  componentType?: string;
  titleRu?: string;
  notesRu?: string;
}

export interface CreateClaimAttachmentRequest {
  attachmentType?: RightsClaimAttachmentType;
  title: string;
  fileName?: string;
  mediaAssetId?: string;
  storageKey?: string;
  url?: string;
  sha256?: string;
  contentType?: string;
  sizeBytes?: number;
  notesRu?: string;
}

export interface QueryRightsClaimsParams {
  q?: string;
  status?: RightsClaimStatus;
  claimType?: RightsClaimType;
  severity?: RightsClaimSeverity;
  resolution?: RightsClaimResolution;
  channel?: RightsClaimChannel;
  claimantType?: RightsClaimantType;
  assignedToUserId?: string;
  bookId?: string;
  bookVersionId?: string;
  rightsProfileId?: string;
  countryCode?: string;
  openOnly?: boolean;
  overdueOnly?: boolean;
  hasActiveBlock?: boolean;
  deadlineWithinDays?: number;
  receivedFrom?: string;
  receivedTo?: string;
  requiresLawyerReview?: boolean;
  page?: number;
  limit?: number;
}

export interface RightsClaimsListResponse {
  items: RightsClaimSummary[];
  total: number;
  page: number;
  limit: number;
}
