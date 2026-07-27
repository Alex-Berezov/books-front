/**
 * Rights licenses (Phase 15).
 *
 * Licenses are versioned records with a territory, language and media-format scope.
 * A country marked LICENSE_REQUIRED can only be published when a valid license covers
 * that country plus the version's language and format.
 */

export type RightsLicenseType =
  | 'DIRECT_LICENSE'
  | 'DIRECT_PERMISSION'
  | 'RIGHTS_ASSIGNMENT'
  | 'WORK_FOR_HIRE'
  | 'OPEN_LICENSE'
  | 'PUBLIC_DOMAIN_DEDICATION'
  | 'OTHER';

export type RightsLicenseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'UNCERTAIN'
  | 'SUPERSEDED';

export type RightsLicenseTerritoryScope =
  | 'WORLDWIDE'
  | 'COUNTRY_LIST'
  | 'EXCEPT_COUNTRY_LIST'
  | 'UNKNOWN';

export type RightsLicenseMediaFormat =
  | 'TEXT_ONLINE'
  | 'TEXT_DOWNLOAD'
  | 'EBOOK'
  | 'AUDIO_STREAMING'
  | 'AUDIO_DOWNLOAD'
  | 'IMAGE'
  | 'PRINT'
  | 'OTHER';

export type RightsLicenseLinkType =
  | 'RIGHTS_PROFILE'
  | 'RIGHTS_COMPONENT'
  | 'COMPONENT_TERRITORY_ASSESSMENT'
  | 'TERRITORY_DECISION'
  | 'SOURCE_EDITION'
  | 'RIGHTS_EVIDENCE'
  | 'BOOK_VERSION';

export type RightsLicenseEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'ACTIVATED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'RENEWED'
  | 'LINKED'
  | 'UNLINKED'
  | 'DOCUMENT_ATTACHED'
  | 'IMPORTED_FROM_REVIEW';

export type LicenseCoverageStatus = 'NOT_REQUIRED' | 'COVERED' | 'PARTIAL' | 'NOT_COVERED';

export interface RightsLicenseSummary {
  id: string;
  licenseKey: string | null;
  licenseType: RightsLicenseType;
  status: RightsLicenseStatus;
  /** Status computed server-side at request time (expiry, revocation, effective date applied). */
  effectiveStatus: RightsLicenseStatus;
  title: string;
  licensor: string;
  licensee: string | null;
  rightsHolder: string | null;
  referenceNumber: string | null;
  grantedAt: string | null;
  effectiveFrom: string | null;
  expiresAt: string | null;
  isPerpetual: boolean;
  territoryScope: RightsLicenseTerritoryScope;
  countryCodes: string[];
  excludedCountryCodes: string[];
  languageCodes: string[];
  mediaFormats: RightsLicenseMediaFormat[];
  commercialUseAllowed: boolean;
  modificationAllowed: boolean;
  translationAllowed: boolean;
  sublicensingAllowed: boolean;
  attributionRequired: boolean;
  requiredAttributionText: string | null;
  exclusive: boolean;
  revocable: boolean;
  revokedAt: string | null;
  revocationReasonRu: string | null;
  confidence: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsLicenseLink {
  id: string;
  rightsLicenseId: string;
  linkType: RightsLicenseLinkType;
  rightsProfileId: string | null;
  rightsComponentId: string | null;
  componentTerritoryAssessmentId: string | null;
  territoryDecisionId: string | null;
  sourceEditionId: string | null;
  rightsEvidenceId: string | null;
  bookVersionId: string | null;
  coversCountryCodes: string[];
  notesRu: string | null;
  createdAt: string;
}

export interface RightsLicenseEvent {
  id: string;
  eventType: RightsLicenseEventType;
  previousStatus: RightsLicenseStatus | null;
  currentStatus: RightsLicenseStatus | null;
  notesRu: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface RightsLicense extends RightsLicenseSummary {
  royaltyTermsRu: string | null;
  otherConditionsRu: string | null;
  notesRu: string | null;
  documentStorageKey: string | null;
  documentSha256: string | null;
  documentUrl: string | null;
  documentMediaAssetId: string | null;
  sourceEvidenceIds: string[];
  createdByUserId: string | null;
  revokedByUserId: string | null;
  links: RightsLicenseLink[];
  events: RightsLicenseEvent[];
  warnings: string[];
}

export interface LicenseIssue {
  code: string;
  severity: 'BLOCKER' | 'WARNING';
  messageRu: string;
  licenseId?: string;
  countryCode?: string;
}

export interface CountryCoverageResult {
  countryCode: string;
  covered: boolean;
  licenseIds: string[];
  issues: LicenseIssue[];
}

export interface LicenseCoverageResult {
  status: LicenseCoverageStatus;
  checkedAt: string;
  requiredCountryCodes: string[];
  coveredCountryCodes: string[];
  uncoveredCountryCodes: string[];
  countries: CountryCoverageResult[];
  licenseIds: string[];
  blockers: LicenseIssue[];
  warnings: LicenseIssue[];
  attributionTextsRu: string[];
}

export interface CreateRightsLicenseRequest {
  licenseKey?: string;
  licenseType?: RightsLicenseType;
  status?: RightsLicenseStatus;
  title: string;
  licensor: string;
  licensee?: string;
  rightsHolder?: string;
  referenceNumber?: string;
  grantedAt?: string;
  effectiveFrom?: string;
  expiresAt?: string;
  isPerpetual?: boolean;
  territoryScope?: RightsLicenseTerritoryScope;
  countryCodes?: string[];
  excludedCountryCodes?: string[];
  languageCodes?: string[];
  mediaFormats?: RightsLicenseMediaFormat[];
  commercialUseAllowed?: boolean;
  modificationAllowed?: boolean;
  translationAllowed?: boolean;
  sublicensingAllowed?: boolean;
  attributionRequired?: boolean;
  requiredAttributionText?: string;
  exclusive?: boolean;
  revocable?: boolean;
  royaltyTermsRu?: string;
  otherConditionsRu?: string;
  notesRu?: string;
  documentStorageKey?: string;
  documentSha256?: string;
  documentUrl?: string;
  documentMediaAssetId?: string;
  sourceEvidenceIds?: string[];
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export type UpdateRightsLicenseRequest = Partial<CreateRightsLicenseRequest>;

export interface RevokeRightsLicenseRequest {
  reasonRu: string;
}

export interface LinkRightsLicenseRequest {
  linkType: RightsLicenseLinkType;
  rightsProfileId?: string;
  rightsComponentId?: string;
  componentTerritoryAssessmentId?: string;
  territoryDecisionId?: string;
  sourceEditionId?: string;
  rightsEvidenceId?: string;
  bookVersionId?: string;
  coversCountryCodes?: string[];
  notesRu?: string;
}

export interface QueryRightsLicensesParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: RightsLicenseStatus;
  licenseType?: RightsLicenseType;
  territoryScope?: RightsLicenseTerritoryScope;
  countryCode?: string;
  languageCode?: string;
  mediaFormat?: RightsLicenseMediaFormat;
  rightsProfileId?: string;
  bookVersionId?: string;
  expiringInDays?: number;
}

export interface RightsLicensesListResponse {
  items: RightsLicenseSummary[];
  total: number;
  page: number;
  limit: number;
}
