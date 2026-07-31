export type GeoBlockScope =
  | 'ENTIRE_BOOK'
  | 'LANGUAGE_EDITION'
  | 'TEXT_READER'
  | 'DOWNLOADS'
  | 'AUDIO'
  | 'SPECIFIC_ASSET';

export interface GeoBlockRule {
  id: string;
  bookId: string | null;
  bookVersionId: string | null;
  rightsProfileId: string | null;
  territoryDecisionId: string | null;
  scope: GeoBlockScope;
  countryCode: string;
  accessPolicy: string;
  sourceFinalStatus: string | null;
  isActive: boolean;
  reasonRu: string | null;
  legalBasisRu: string | null;
  generatedFrom: string;
  generatedAt: string;
  verifiedAt: string | null;
  verifiedByUserId: string | null;
  verificationNotesRu: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeoBlockRulesSummary {
  geoBlockRequired: boolean;
  configured: boolean;
  verifiedAt: string | null;
  lastGeneratedAt: string | null;
  totalRulesCount: number;
  activeRulesCount: number;
  verifiedRulesCount: number;
  blockedCountries: string[];
  scopes: GeoBlockScope[];
}

export interface GeoBlockRulesResponse {
  bookVersionId: string;
  rules: GeoBlockRule[];
  summary: GeoBlockRulesSummary;
}

export interface CheckGeoBlockAccessRequest {
  countryCode: string;
  scope: GeoBlockScope;
}

export interface GeoAccessCheckResult {
  allowed: boolean;
  countryCode: string;
  scope: GeoBlockScope;
  matchedRuleId: string | null;
  reasonCode: string | null;
  messageRu: string | null;
  bookVersionId: string | null;
}

export interface VerifyGeoBlockRulesRequest {
  verified: boolean;
  notesRu?: string | null;
}

/**
 * WP-1.2а. Phase 12 resolves the visitor country from an upstream proxy header, so geo-blocking
 * stops working silently if that header disappears. These counters make the outage visible.
 */
export type GeoCountrySourceStatus = 'NO_DATA' | 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';

export interface GeoCountrySourceHealth {
  status: GeoCountrySourceStatus;
  resolvedCount: number;
  unknownCount: number;
  totalCount: number;
  unknownRatio: number;
  lastResolvedHeader: string | null;
  lastResolvedAt: string | null;
  lastUnknownAt: string | null;
  windowStartedAt: string;
}
