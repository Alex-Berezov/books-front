/**
 * Phase 17 — Agent/API import automation.
 * Mirrors `books/src/modules/rights-agent/dto/*`.
 */

export type RightsAgentTokenStatus = 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED';

export type RightsAgentSubmissionStatus =
  | 'RECEIVED'
  | 'VALIDATED'
  | 'VALIDATION_FAILED'
  | 'REJECTED'
  | 'FAILED';

export type RightsAgentMaterialization = 'NOT_ATTEMPTED' | 'SKIPPED' | 'SUCCEEDED' | 'FAILED';

export type RightsNotificationType =
  | 'AGENT_REPORT_RECEIVED'
  | 'AGENT_REPORT_VALIDATION_FAILED'
  | 'AGENT_REPORT_MATERIALIZED'
  | 'AGENT_REPORT_MATERIALIZATION_FAILED'
  | 'AGENT_TOKEN_ISSUED'
  | 'AGENT_TOKEN_REVOKED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'RECHECK_DUE'
  | 'RECHECK_OVERDUE'
  | 'RECHECK_TASK_OPENED'
  | 'RECHECK_COMPLETED'
  | 'LEGAL_CHANGE_APPLIED'
  | 'LAWYER_REVIEW_REQUIRED'
  | 'OTHER'
  // Phase 19: lawyer workflow
  | 'LAWYER_REVIEW_ASSIGNED'
  | 'LAWYER_REVIEW_APPROVED'
  | 'LAWYER_REVIEW_REJECTED'
  | 'LAWYER_REVIEW_WITHDRAWN'
  | 'LAWYER_OPINION_EXPIRING'
  | 'LAWYER_OPINION_EXPIRED';

/** Human-readable labels shown in the bell and the notification inbox. */
export const RIGHTS_NOTIFICATION_TYPE_LABELS_RU: Record<RightsNotificationType, string> = {
  AGENT_REPORT_RECEIVED: 'Получен отчёт агента',
  AGENT_REPORT_VALIDATION_FAILED: 'Отчёт агента не прошёл валидацию',
  AGENT_REPORT_MATERIALIZED: 'Отчёт агента материализован',
  AGENT_REPORT_MATERIALIZATION_FAILED: 'Ошибка материализации отчёта',
  AGENT_TOKEN_ISSUED: 'Выпущен токен агента',
  AGENT_TOKEN_REVOKED: 'Токен агента отозван',
  HUMAN_REVIEW_REQUIRED: 'Требуется проверка человеком',
  RECHECK_DUE: 'Срок перепроверки',
  RECHECK_OVERDUE: 'Перепроверка просрочена',
  RECHECK_TASK_OPENED: 'Открыта задача перепроверки',
  RECHECK_COMPLETED: 'Перепроверка завершена',
  LEGAL_CHANGE_APPLIED: 'Применено изменение законодательства',
  LAWYER_REVIEW_REQUIRED: 'Требуется юридическая проверка',
  OTHER: 'Другое',
  LAWYER_REVIEW_ASSIGNED: 'Вам назначена юридическая проверка',
  LAWYER_REVIEW_APPROVED: 'Юрист согласовал права',
  LAWYER_REVIEW_REJECTED: 'Юрист отказал',
  LAWYER_REVIEW_WITHDRAWN: 'Юридическая проверка отозвана',
  LAWYER_OPINION_EXPIRING: 'Заключение юриста истекает',
  LAWYER_OPINION_EXPIRED: 'Заключение юриста истекло',
};

export type RightsNotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface RightsAgentToken {
  id: string;
  rightsIntakeId: string;
  /** First 12 characters of the token — the full value is never returned again. */
  tokenPrefix: string;
  status: RightsAgentTokenStatus;
  labelRu: string | null;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
  failedAttempts: number;
  maxFailedAttempts: number;
  allowRetryOnValidationError: boolean;
  autoMaterialize: boolean;
  allowedSchemaVersions: string[] | null;
  expiresAt: string;
  isExpired: boolean;
  isUsable: boolean;
  issuedByUserId: string | null;
  firstUsedAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokeReasonRu: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response of the issue endpoint — the only place the raw `token` is ever returned. */
export interface RightsAgentTokenIssued extends RightsAgentToken {
  token: string;
}

export interface RightsAgentSubmission {
  id: string;
  rightsIntakeId: string;
  uploadTokenId: string | null;
  tokenPrefix: string | null;
  status: RightsAgentSubmissionStatus;
  declaredSchemaVersion: string | null;
  reportJsonSha256: string | null;
  payloadSizeBytes: number | null;
  sourceFileName: string | null;
  agentName: string | null;
  agentVersion: string | null;
  rightsReviewImportId: string | null;
  validationErrorCount: number;
  validationWarningCount: number;
  rejectionCode: string | null;
  rejectionMessageRu: string | null;
  materialization: RightsAgentMaterialization;
  materializationError: string | null;
  materializedProfileId: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface RightsNotification {
  id: string;
  type: RightsNotificationType;
  severity: RightsNotificationSeverity;
  titleRu: string;
  messageRu: string;
  rightsIntakeId: string | null;
  agentSubmissionId: string | null;
  rightsReviewImportId: string | null;
  rightsProfileId: string | null;
  bookVersionId: string | null;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface RightsAgentTokensListResponse {
  items: RightsAgentToken[];
  total: number;
  page: number;
  limit: number;
}

export interface RightsAgentSubmissionsListResponse {
  items: RightsAgentSubmission[];
  total: number;
  page: number;
  limit: number;
}

export interface RightsNotificationsListResponse {
  items: RightsNotification[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateRightsAgentTokenRequest {
  labelRu?: string;
  ttlHours?: number;
  maxUses?: number;
  allowedSchemaVersions?: string[];
  autoMaterialize?: boolean;
  allowRetryOnValidationError?: boolean;
}

export interface RevokeRightsAgentTokenRequest {
  reasonRu: string;
}

export interface ListRightsAgentTokensParams {
  page?: number;
  limit?: number;
  status?: RightsAgentTokenStatus;
}

export interface ListRightsAgentSubmissionsParams {
  page?: number;
  limit?: number;
  status?: RightsAgentSubmissionStatus;
  intakeId?: string;
}

export interface ListRightsNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: RightsNotificationType;
  severity?: RightsNotificationSeverity;
  rightsIntakeId?: string;
}

export interface RightsNotificationsUnreadCount {
  unreadCount: number;
}

export interface RightsNotificationsMarkAllReadResponse {
  updated: number;
}
