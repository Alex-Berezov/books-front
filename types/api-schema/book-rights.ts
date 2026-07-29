import type { RightsClaimSummary } from './rights-claims';
import type {
  RightsIntake,
  RightsProfileDetail,
  RightsReview,
  RightsApprovalDecision,
  PublicationGateResult,
  RightsContentHashCheck,
} from './rights-intake';
import type { RightsRecheckSchedule, RightsRecheckTask } from './rights-recheck';

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
  // Phase 15: license snapshot recorded at publish / book creation time
  rightsLicenseCoverageStatus?: string | null;
  rightsLicenseCheckedAt?: string | null;
  rightsLicenseIds?: string[] | null;
  // Phase 16: denormalised rights-claim block state
  rightsClaimBlockActive?: boolean;
  rightsClaimBlockAppliedAt?: string | null;
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
  contributorsCount?: number;
  authorsCount?: number;
  translatorsCount?: number;
  narratorsCount?: number;
  contributorsWithoutPersonCount?: number;
  regionCount?: number;
  blockedRegionCount?: number;
  licenseRequiredRegionCount?: number;
  pendingReviewRegionCount?: number;
  mixedRegionCount?: number;
  notTargetedRegionCount?: number;
  // Phase 15: license metrics
  licensesCount?: number;
  activeLicensesCount?: number;
  expiredLicensesCount?: number;
  revokedLicensesCount?: number;
  expiringSoonLicensesCount?: number;
  attributionRequiredLicensesCount?: number;
  licenseCoverageStatus?: string;
  licenseCoveredCountriesCount?: number;
  licenseUncoveredCountriesCount?: number;
  // Phase 16: rights claims / DMCA
  claimsCount?: number;
  activeClaimsCount?: number;
  blockingClaimsCount?: number;
  criticalClaimsCount?: number;
  overdueClaimsCount?: number;
  activeClaimBlocksCount?: number;
  claimBlockedCountriesCount?: number;
  hasWorldwideClaimBlock?: boolean;
  worstClaimSeverity?: string | null;
  // Phase 18: automatic recheck
  openRecheckTasksCount?: number;
  overdueRecheckTasksCount?: number;
  blockingRecheckTasksCount?: number;
  nextRecheckDueAt?: string | null;
  lastRecheckScanAt?: string | null;
  recheckPolicy?: string | null;
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
  /** Phase 16: up to 50 most recent claims for this version and its book. */
  claims?: RightsClaimSummary[];
  /** Phase 18: up to 50 recheck tasks of this version and its rights profile. */
  recheckTasks?: RightsRecheckTask[];
  recheckSchedule?: RightsRecheckSchedule | null;
  summary: BookRightsDashboardMetrics;
}
