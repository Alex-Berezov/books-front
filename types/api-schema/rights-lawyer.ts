/**
 * Phase 19 — Lawyer Workflow. Mirrors `books/src/modules/rights-lawyer/dto/*`.
 * Statuses and enums are string unions, matching the convention of the other rights types.
 */

export type RightsRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RightsLawyerType = 'IN_HOUSE' | 'EXTERNAL_COUNSEL' | 'LAW_FIRM' | 'OTHER';

export type RightsLawyerReviewStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'APPROVED_WITH_CONDITIONS'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export type RightsLawyerDecision = 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED';

export type RightsLawyerReviewTrigger =
  | 'AGENT_REQUESTED'
  | 'HIGH_RISK_POLICY'
  | 'MANUAL_REQUEST'
  | 'RIGHTS_CLAIM'
  | 'LEGAL_CHANGE'
  | 'LICENSE_REQUIRED'
  | 'OTHER';

export type RightsLegalOpinionKind =
  | 'EXTERNAL_COUNSEL_MEMO'
  | 'IN_HOUSE_MEMO'
  | 'EMAIL_CONFIRMATION'
  | 'COURT_FILING'
  | 'REGULATOR_RESPONSE'
  | 'OTHER';

export type RightsLawyerConditionStatus = 'PENDING' | 'SATISFIED' | 'WAIVED';

export type RightsLawyerReviewEventType =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'STARTED'
  | 'OPINION_ATTACHED'
  | 'OPINION_ARCHIVED'
  | 'CONDITION_ADDED'
  | 'CONDITION_SATISFIED'
  | 'CONDITION_WAIVED'
  | 'DECIDED'
  | 'WITHDRAWN'
  | 'REOPENED'
  | 'EXPIRED'
  | 'DUE_DATE_CHANGED'
  | 'NOTE_ADDED';

export type RightsRiskFactorCode =
  | 'PUBLICATION_GATE_BLOCK'
  | 'OVERALL_STATUS_REJECTED'
  | 'CLAIM_ESCALATED_TO_LAWYER'
  | 'CRITICAL_CLAIM_OPEN'
  | 'AGENT_REQUESTED_LAWYER_REVIEW'
  | 'CONFIDENCE_LOW'
  | 'OVERALL_STATUS_INSUFFICIENT_DATA'
  | 'OVERALL_STATUS_LICENSE_REQUIRED'
  | 'UNCERTAIN_COMPONENT'
  | 'COPYRIGHTED_COMPONENT_KEPT'
  | 'LICENSE_REQUIRED_TERRITORY'
  | 'UNRESOLVED_BLOCKING_ACTION'
  | 'PENDING_REVIEW_TERRITORY'
  | 'CONFIDENCE_MEDIUM'
  | 'DERIVATIVE_SOURCE_TEXT'
  | 'CONTRIBUTOR_DEATH_YEAR_UNKNOWN'
  | 'BLOCKED_TERRITORY';

export interface RiskFactor {
  code: RightsRiskFactorCode;
  level: RightsRiskLevel;
  messageRu: string;
  details?: Record<string, unknown> | null;
}

export interface RightsLawyer {
  id: string;
  fullName: string;
  lawyerType: RightsLawyerType;
  organization: string | null;
  barId: string | null;
  email: string | null;
  phone: string | null;
  jurisdictionCodes: string[];
  specializationRu: string | null;
  notesRu: string | null;
  userId: string | null;
  userEmail: string | null;
  /** Привязанный пользователь есть, но роли `lawyer` у него нет. */
  hasLawyerRole: boolean;
  isActive: boolean;
  deactivatedAt: string | null;
  deactivateReasonRu: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsLawyerDetail extends RightsLawyer {
  openReviewsCount: number;
  decidedReviewsCount: number;
  opinionsCount: number;
}

export interface RightsLawyerCondition {
  id: string;
  rightsLawyerReviewId: string;
  code: string;
  textRu: string;
  status: RightsLawyerConditionStatus;
  isBlocking: boolean;
  affectedCountryCodes: string[];
  satisfiedAt: string | null;
  satisfiedNotesRu: string | null;
  waivedAt: string | null;
  waiveReasonRu: string | null;
  createdAt: string;
}

export interface RightsLegalOpinion {
  id: string;
  rightsLawyerReviewId: string;
  kind: RightsLegalOpinionKind;
  titleRu: string;
  bodyRu: string;
  lawyerId: string | null;
  lawyerNameSnapshot: string | null;
  documentUrl: string | null;
  documentSha256: string | null;
  fileName: string | null;
  mimeType: string | null;
  issuedAt: string | null;
  jurisdictionCodes: string[];
  /** Доказательство типа LEGAL_OPINION, созданное автоматически. */
  rightsEvidenceId: string | null;
  archivedAt: string | null;
  archiveReasonRu: string | null;
  createdAt: string;
}

export interface RightsLawyerReviewEvent {
  id: string;
  eventType: RightsLawyerReviewEventType;
  fromStatus: RightsLawyerReviewStatus | null;
  toStatus: RightsLawyerReviewStatus | null;
  messageRu: string;
  payload: Record<string, unknown> | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface RightsLawyerReview {
  id: string;
  reviewNumber: string;
  status: RightsLawyerReviewStatus;
  /** `EXPIRED`, если срок действия заключения прошёл, даже когда в БД ещё `APPROVED`. */
  effectiveStatus: RightsLawyerReviewStatus;
  trigger: RightsLawyerReviewTrigger;
  riskLevel: RightsRiskLevel;
  rightsProfileId: string | null;
  rightsIntakeId: string | null;
  rightsReviewId: string | null;
  bookId: string | null;
  bookVersionId: string | null;
  rightsClaimId: string | null;
  titleRu: string;
  questionRu: string;
  contextRu: string | null;
  affectedCountryCodes: string[];
  affectedLanguages: string[];
  affectedComponentIds: string[];
  blocksApproval: boolean;
  requestedByUserId: string | null;
  requestedAt: string;
  dueAt: string | null;
  assignedLawyerId: string | null;
  assignedLawyerName: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  decision: RightsLawyerDecision | null;
  decidedAt: string | null;
  decidedByUserId: string | null;
  decidedLawyerId: string | null;
  /** Имя юриста на момент решения — приоритетно для отображения истории. */
  lawyerNameSnapshot: string | null;
  opinionSummaryRu: string | null;
  restrictionsRu: string | null;
  approvedCountryCodes: string[];
  blockedCountryCodes: string[];
  validUntil: string | null;
  expiredAt: string | null;
  withdrawnAt: string | null;
  withdrawReasonRu: string | null;
  reopenedAt: string | null;
  isOverdue: boolean;
  daysUntilDue: number | null;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  blocksPublication: boolean;
  pendingConditionsCount: number;
  blockingConditionsCount: number;
  satisfiedConditionsCount: number;
  opinionsCount: number;
  activeOpinionsCount: number;
  intakeTitle: string | null;
  bookSlug: string | null;
  versionLanguage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsLawyerReviewDetail extends RightsLawyerReview {
  conditions: RightsLawyerCondition[];
  opinions: RightsLegalOpinion[];
  events: RightsLawyerReviewEvent[];
  riskFactors: RiskFactor[];
}

export interface RiskAssessmentSnapshot {
  rightsProfileId: string;
  riskLevel: RightsRiskLevel;
  factors: RiskFactor[];
  lawyerReviewRequired: boolean;
  blockApprovalEnabled: boolean;
  minRiskLevel: RightsRiskLevel;
  assessedAt: string | null;
  currentLawyerReview: RightsLawyerReview | null;
  explicitLawyerRequest: boolean;
  suggestedTrigger: RightsLawyerReviewTrigger;
  lawyerApproved: boolean;
  lawyerApprovedAt: string | null;
  lawyerApprovedLawyerName: string | null;
  lawyerOpinionValidUntil: string | null;
}

export interface LawyerGateReason {
  code: string;
  messageRu: string;
  lawyerReviewId: string | null;
  details: Record<string, unknown> | null;
}

export interface VersionLawyerReview {
  versionId: string;
  bookId: string | null;
  rightsProfileId: string | null;
  blockers: LawyerGateReason[];
  warnings: LawyerGateReason[];
  lawyerReviewRequired: boolean;
  lawyerApproved: boolean;
  openReviewsCount: number;
  pendingConditionsCount: number;
  riskLevel: RightsRiskLevel | null;
  lawyerOpinionValidUntil: string | null;
  reviewIds: string[];
  lawyerApprovedAt: string | null;
  lawyerApprovedLawyerName: string | null;
  isExpiringSoon: boolean;
  reviews: RightsLawyerReview[];
  pendingConditions: RightsLawyerCondition[];
}

export interface LawyerExpiryScanResult {
  checkedCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  notificationsSent: number;
  reviewIds: string[];
  runAt: string;
}

// ---------------------------------------------------------------------------
// Requests and query params
// ---------------------------------------------------------------------------

export interface ListLawyersParams {
  q?: string;
  lawyerType?: RightsLawyerType;
  isActive?: boolean;
  jurisdictionCode?: string;
  page?: number;
  limit?: number;
}

export interface ListLawyerReviewsParams {
  status?: RightsLawyerReviewStatus;
  trigger?: RightsLawyerReviewTrigger;
  riskLevel?: RightsRiskLevel;
  decision?: RightsLawyerDecision;
  assignedLawyerId?: string;
  rightsIntakeId?: string;
  rightsProfileId?: string;
  bookId?: string;
  bookVersionId?: string;
  rightsClaimId?: string;
  blocksApproval?: boolean;
  overdueOnly?: boolean;
  unassignedOnly?: boolean;
  expiringWithinDays?: number;
  mine?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateLawyerRequest {
  fullName: string;
  lawyerType?: RightsLawyerType;
  organization?: string;
  barId?: string;
  email?: string;
  phone?: string;
  jurisdictionCodes?: string[];
  specializationRu?: string;
  notesRu?: string;
  userId?: string | null;
}

export type UpdateLawyerRequest = Partial<CreateLawyerRequest>;

export interface ReasonRequest {
  reasonRu: string;
}

export interface RequestLawyerReviewRequest {
  rightsProfileId?: string;
  rightsIntakeId?: string;
  rightsReviewId?: string;
  bookId?: string;
  bookVersionId?: string;
  rightsClaimId?: string;
  trigger?: RightsLawyerReviewTrigger;
  titleRu: string;
  questionRu: string;
  contextRu?: string;
  affectedCountryCodes?: string[];
  affectedLanguages?: string[];
  affectedComponentIds?: string[];
  riskLevel?: RightsRiskLevel;
  blocksApproval?: boolean;
  dueAt?: string;
  assignedLawyerId?: string;
}

export interface RequireLawyerReviewRequest {
  questionRu?: string;
  dueAt?: string;
  blocksApproval?: boolean;
  assignedLawyerId?: string;
}

export interface AssignLawyerReviewRequest {
  lawyerId: string;
}

export interface LawyerConditionInput {
  code: string;
  textRu: string;
  isBlocking?: boolean;
  affectedCountryCodes?: string[];
}

export interface DecideLawyerReviewRequest {
  decision: RightsLawyerDecision;
  lawyerId: string;
  opinionSummaryRu: string;
  restrictionsRu?: string;
  approvedCountryCodes?: string[];
  blockedCountryCodes?: string[];
  validUntil?: string;
  conditions?: LawyerConditionInput[];
}

export interface CreateLegalOpinionRequest {
  kind?: RightsLegalOpinionKind;
  titleRu: string;
  bodyRu: string;
  lawyerId?: string;
  documentUrl?: string;
  documentSha256?: string;
  fileName?: string;
  mimeType?: string;
  issuedAt?: string;
  jurisdictionCodes?: string[];
}

export interface SatisfyConditionRequest {
  notesRu?: string;
}

export interface AddLawyerReviewNoteRequest {
  messageRu: string;
}

export interface RightsLawyersListResponse {
  items: RightsLawyer[];
  total: number;
  page: number;
  limit: number;
}

export interface RightsLawyerReviewsListResponse {
  items: RightsLawyerReview[];
  total: number;
  page: number;
  limit: number;
}
