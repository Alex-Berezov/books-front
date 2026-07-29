/**
 * Phase 18: automatic recheck.
 * Mirrors `books/src/modules/rights-recheck/dto/*` — keep both sides in sync.
 */

export type RightsRecheckReason =
  | 'SCHEDULED_DUE'
  | 'CONTENT_CHANGED'
  | 'RIGHTS_DATA_CHANGED'
  | 'LANGUAGE_ADDED'
  | 'AUDIO_ADDED'
  | 'COMPONENT_ADDED'
  | 'LEGAL_CHANGE'
  | 'REVIEW_STALE'
  | 'MANUAL_REQUEST'
  | 'OTHER';

export type RightsRecheckStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';

export type RightsRecheckSeverity = 'INFO' | 'WARNING' | 'BLOCKING';

export type RightsRecheckReminderStage =
  | 'NONE'
  | 'LEAD_30'
  | 'LEAD_7'
  | 'DUE'
  | 'OVERDUE'
  | 'ESCALATED';

export type RightsRecheckResolution =
  | 'NEW_REVIEW_APPROVED'
  | 'SUPERSEDED_BY_NEW_REVIEW'
  | 'NO_CHANGE_NEEDED'
  | 'CONTENT_REVERTED'
  | 'MANUALLY_CLOSED'
  | 'DISMISSED_NOT_APPLICABLE'
  | 'OTHER';

export type RightsRecheckTriggerSource =
  | 'SCHEDULER'
  | 'CONTENT_HASH'
  | 'VERSION_CREATED'
  | 'LEGAL_CHANGE'
  | 'MANUAL';

export type RightsRecheckPolicy = 'INHERIT_REPORT' | 'FIXED_INTERVAL' | 'MANUAL_ONLY' | 'PAUSED';

export type RightsLegalChangeType =
  | 'COPYRIGHT_TERM_CHANGE'
  | 'PUBLIC_DOMAIN_RULE_CHANGE'
  | 'TRANSLATION_RIGHTS_CHANGE'
  | 'NEIGHBOURING_RIGHTS_CHANGE'
  | 'COURT_DECISION'
  | 'TREATY_RATIFICATION'
  | 'PLATFORM_POLICY_CHANGE'
  | 'OTHER';

export type RightsLegalChangeStatus = 'DRAFT' | 'APPLIED' | 'ARCHIVED';

export type RightsRecheckEventType =
  | 'TASK_CREATED'
  | 'REMINDER_SENT'
  | 'SEVERITY_ESCALATED'
  | 'SNOOZED'
  | 'STARTED'
  | 'COMPLETED'
  | 'DISMISSED'
  | 'REOPENED'
  | 'DUE_DATE_CHANGED'
  | 'LINKED_TO_REVIEW'
  | 'NOTE_ADDED';

export type RightsRecheckScanStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface RightsRecheckTask {
  id: string;
  reason: RightsRecheckReason;
  reasonRu: string;
  status: RightsRecheckStatus;
  severity: RightsRecheckSeverity;
  source: RightsRecheckTriggerSource;
  rightsProfileId: string | null;
  rightsIntakeId: string | null;
  baselineReviewId: string | null;
  bookId: string | null;
  bookVersionId: string | null;
  legalChangeEventId: string | null;
  titleRu: string;
  descriptionRu: string;
  triggerCode: string | null;
  affectedCountryCodes: string[];
  dueAt: string;
  reminderStage: RightsRecheckReminderStage;
  remindersSentCount: number;
  lastReminderAt: string | null;
  snoozedUntil: string | null;
  snoozeReasonRu: string | null;
  startedAt: string | null;
  startedByUserId: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  completionNotesRu: string | null;
  completedReviewId: string | null;
  dismissedAt: string | null;
  dismissedByUserId: string | null;
  dismissReasonRu: string | null;
  resolution: RightsRecheckResolution | null;
  resolutionRu: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Computed server-side at request time — never persisted. */
  isOpen: boolean;
  isOverdue: boolean;
  daysUntilDue: number;
  isSnoozed: boolean;
  effectiveSeverity: RightsRecheckSeverity;
}

export interface RightsRecheckEvent {
  id: string;
  eventType: RightsRecheckEventType;
  fromStatus: RightsRecheckStatus | null;
  toStatus: RightsRecheckStatus | null;
  messageRu: string;
  payload: Record<string, unknown> | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface RightsRecheckTaskTargets {
  intakeTitle?: string | null;
  intakeStatus?: string | null;
  profileStatus?: string | null;
  versionLanguage?: string | null;
  versionTitle?: string | null;
}

export interface RightsRecheckTaskDetail extends RightsRecheckTask {
  events: RightsRecheckEvent[];
  targets: RightsRecheckTaskTargets;
}

export interface RightsRecheckTasksListResponse {
  items: RightsRecheckTask[];
  total: number;
  page: number;
  limit: number;
}

export interface RightsRecheckSchedule {
  rightsProfileId: string;
  recheckPolicy: RightsRecheckPolicy;
  recheckIntervalDays: number | null;
  nextReviewAt: string | null;
  recheckPausedUntil: string | null;
  recheckPauseReasonRu: string | null;
  lastRecheckScanAt: string | null;
  computedDueAt: string | null;
  openTasksCount: number;
}

export interface RightsRecheckScheduleWithTasks extends RightsRecheckSchedule {
  openTasks: RightsRecheckTask[];
}

export interface RightsRecheckGateReason {
  code: string;
  messageRu: string;
  taskId: string | null;
  details: Record<string, unknown> | null;
}

export interface VersionRecheckEvaluation {
  versionId: string;
  blockers: RightsRecheckGateReason[];
  warnings: RightsRecheckGateReason[];
  openTasksCount: number;
  overdueTasksCount: number;
  blockingTasksCount: number;
  nextRecheckDueAt: string | null;
  taskIds: string[];
  tasks: RightsRecheckTask[];
  schedule: RightsRecheckSchedule | null;
}

export interface RightsLegalChange {
  id: string;
  titleRu: string;
  descriptionRu: string;
  changeType: RightsLegalChangeType;
  status: RightsLegalChangeStatus;
  severity: RightsRecheckSeverity;
  jurisdictionCodes: string[];
  appliesToAllCountries: boolean;
  effectiveFrom: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  appliedAt: string | null;
  appliedByUserId: string | null;
  affectedProfilesCount: number;
  createdTasksCount: number;
  archivedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsLegalChangeDetail extends RightsLegalChange {
  tasks: RightsRecheckTask[];
  tasksCount: number;
}

export interface RightsLegalChangesListResponse {
  items: RightsLegalChange[];
  total: number;
  page: number;
  limit: number;
}

export interface RightsReviewChainDiff {
  overallStatusChanged: boolean;
  publicationGateChanged: boolean;
  confidenceChanged: boolean;
  changedCountryCount: number;
}

export interface RightsReviewChainItem {
  id: string;
  revisionNumber: number;
  previousReviewId: string | null;
  chainRootReviewId: string | null;
  status: string;
  overallStatus: string;
  publicationGate: string;
  confidence: string;
  nextReviewAt: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  approvedByUserName: string | null;
  rightsProfileId: string;
  rightsReviewImportId: string;
  isCurrent: boolean;
  createdAt: string;
  diffFromPrevious: RightsReviewChainDiff | null;
}

export interface RightsReviewChainResponse {
  items: RightsReviewChainItem[];
  total: number;
}

export interface RightsRecheckScanRun {
  id: string;
  status: RightsRecheckScanStatus;
  source: RightsRecheckTriggerSource;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  profilesScanned: number;
  versionsScanned: number;
  tasksCreated: number;
  tasksEscalated: number;
  tasksAutoClosed: number;
  remindersSent: number;
  errorMessage: string | null;
  triggeredByUserId: string | null;
}

export interface RightsRecheckScanRunsListResponse {
  items: RightsRecheckScanRun[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Request payloads and list params
// ---------------------------------------------------------------------------

export interface ListRecheckTasksParams {
  status?: RightsRecheckStatus;
  reason?: RightsRecheckReason;
  severity?: RightsRecheckSeverity;
  source?: RightsRecheckTriggerSource;
  rightsIntakeId?: string;
  rightsProfileId?: string;
  bookId?: string;
  bookVersionId?: string;
  legalChangeEventId?: string;
  overdueOnly?: boolean;
  dueWithinDays?: number;
  page?: number;
  limit?: number;
}

export interface ListScanRunsParams {
  status?: RightsRecheckScanStatus;
  page?: number;
  limit?: number;
}

export interface ListLegalChangesParams {
  status?: RightsLegalChangeStatus;
  changeType?: RightsLegalChangeType;
  severity?: RightsRecheckSeverity;
  countryCode?: string;
  page?: number;
  limit?: number;
}

export interface CreateRecheckTaskRequest {
  reason?: RightsRecheckReason;
  rightsProfileId?: string;
  rightsIntakeId?: string;
  bookVersionId?: string;
  titleRu: string;
  descriptionRu: string;
  dueAt?: string;
  severity?: RightsRecheckSeverity;
}

export interface CompleteRecheckTaskRequest {
  notesRu?: string;
  completedReviewId?: string;
  resolution?: RightsRecheckResolution;
}

export interface DismissRecheckTaskRequest {
  reasonRu: string;
}

export interface SnoozeRecheckTaskRequest {
  until: string;
  reasonRu?: string;
}

export interface UpdateRecheckScheduleRequest {
  nextReviewAt?: string | null;
  recheckPolicy?: RightsRecheckPolicy;
  recheckIntervalDays?: number | null;
  recheckPausedUntil?: string | null;
  recheckPauseReasonRu?: string | null;
}

export interface CreateLegalChangeRequest {
  titleRu: string;
  descriptionRu: string;
  changeType: RightsLegalChangeType;
  severity?: RightsRecheckSeverity;
  jurisdictionCodes: string[];
  appliesToAllCountries?: boolean;
  effectiveFrom?: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export type UpdateLegalChangeRequest = Partial<CreateLegalChangeRequest>;
