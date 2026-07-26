import type {
  RightsIntake,
  RightsProfileDetail,
  RightsReview,
  RightsApprovalDecision,
  PublicationGateResult,
  RightsContentHashCheck,
} from './rights-intake';

export interface BookRightsDashboardBookSummary {
  id: string;
  slug: string;
  rightsIntakeId: string | null;
  currentRightsProfileId: string | null;
  approvedRightsReviewId: string | null;
  rightsCreatedAt: string | null;
}

export interface BookRightsDashboardVersionSummary {
  id: string;
  language: string;
  type: string;
  status: string;
  title?: string;
  rightsProfileId: string | null;
  approvedRightsReviewId: string | null;
  rightsStatus: string | null;
  rightsGeoBlockRequired: boolean;
  rightsGeoBlockConfigured: boolean;
  rightsGeoBlockConfiguredAt?: string | null;
  rightsGeoBlockNotesRu?: string | null;
  rightsGeoBlockVerifiedAt?: string | null;
  rightsGeoBlockVerifiedByUserId?: string | null;
  rightsGeoBlockLastGeneratedAt?: string | null;
  rightsContentHash?: string | null;
  rightsContentHashAlgorithmVersion?: string | null;
  rightsContentHashCalculatedAt?: string | null;
  rightsRecheckRequired: boolean;
  rightsStaleDetectedAt?: string | null;
  rightsStaleReasonCode?: string | null;
  rightsStaleReasonRu?: string | null;
}

export interface BookRightsDashboardMetrics {
  hasClearance: boolean;
  canPublishCurrentVersion: boolean;
  publicationGate: string | null;
  overallStatus: string | null;
  confidence: string | null;
  blockedCountriesCount: number;
  licenseRequiredCountriesCount: number;
  pendingCountriesCount: number;
  geoBlockRequiredCount: number;
  unresolvedBlockingActionsCount: number;
  evidenceCount: number;
  componentsCount: number;
  componentTerritoryAssessmentsCount: number;
  blockedComponentTerritoryAssessmentsCount: number;
  reviewRequiredComponentTerritoryAssessmentsCount: number;
  expiringComponentTerritoryAssessmentsCount: number;
  reviewsCount: number;
  isStale: boolean;
  recheckRequired: boolean;
  regionCount?: number;
  blockedRegionCount?: number;
  licenseRequiredRegionCount?: number;
  pendingReviewRegionCount?: number;
  mixedRegionCount?: number;
  notTargetedRegionCount?: number;
}

export interface BookRightsDashboard {
  book: BookRightsDashboardBookSummary;
  currentVersion: BookRightsDashboardVersionSummary;
  versions: BookRightsDashboardVersionSummary[];
  intake: RightsIntake | null;
  currentProfile: RightsProfileDetail | null;
  approvedReview: RightsReview | null;
  reviewHistory: RightsReview[];
  approvalHistory: RightsApprovalDecision[];
  publicationGate: PublicationGateResult | null;
  contentHash: RightsContentHashCheck | null;
  summary: BookRightsDashboardMetrics;
}
