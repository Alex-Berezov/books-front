export type RightsIntakeStatus =
  | 'DRAFT'
  | 'READY_FOR_AGENT'
  | 'REVIEW_IMPORTED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'BOOK_CREATED'
  | 'ARCHIVED'
  // Phase 19: интейк ушёл на юридическую проверку
  | 'LAWYER_REVIEW_REQUIRED';

export type RightsSourceProvider = 'PROJECT_GUTENBERG' | 'OTHER' | 'UNKNOWN';

export type RightsSourceTextType =
  | 'ORIGINAL_TEXT'
  | 'TRANSLATION'
  | 'ADAPTATION'
  | 'ABRIDGMENT'
  | 'COMPILATION'
  | 'UNKNOWN';

export interface RightsIntake {
  id: string;
  candidateTitle: string;
  candidateAuthor: string;
  originalTitle: string | null;
  originalLanguage: string | null;
  authorBirthYear: number | null;
  authorDeathYear: number | null;
  sourceProvider: RightsSourceProvider;
  sourceExternalId: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceLanguage: string | null;
  sourceTextType: RightsSourceTextType;
  targetLanguages: string[];
  targetCountryCodes: string[];
  plannedContentTypes: string[];
  plannedComponents: string[] | null;
  notesRu: string | null;
  workflowStatus: RightsIntakeStatus;
  createdByUserId: string | null;
  approvedReviewId: string | null;
  createdBookId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeReviewImportSummary {
  id: string;
  importStatus: RightsReviewImportStatus;
  isCurrent: boolean;
  validationErrorsCount: number;
  validationWarningsCount: number;
  createdAt: string;
}

export interface IntakeRightsProfileSummary {
  id: string;
  status: string;
  overallStatus: string;
  publicationGate: string;
  confidence: string;
  blockedCountriesCount: number;
  licenseRequiredCountriesCount: number;
  geoBlockRequiredCount: number;
  blockingActionsCount: number;
}

export interface RightsIntakeListItem extends RightsIntake {
  currentReviewImport?: IntakeReviewImportSummary | null;
  currentRightsProfile?: IntakeRightsProfileSummary | null;
}

export interface RightsIntakesListResponse {
  items: RightsIntakeListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateRightsIntakeRequest {
  candidateTitle: string;
  candidateAuthor: string;
  originalTitle?: string | null;
  originalLanguage?: string | null;
  authorBirthYear?: number | null;
  authorDeathYear?: number | null;
  sourceProvider?: RightsSourceProvider;
  sourceExternalId?: string | null;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceLanguage?: string | null;
  sourceTextType?: RightsSourceTextType;
  targetLanguages: string[];
  targetCountryCodes: string[];
  plannedContentTypes: string[];
  plannedComponents?: string[] | null;
  notesRu?: string | null;
}

export type UpdateRightsIntakeRequest = Partial<CreateRightsIntakeRequest>;

export interface ChangeRightsIntakeStatusRequest {
  status: RightsIntakeStatus;
}

export interface GetRightsIntakesParams {
  page?: number;
  limit?: number;
  status?: RightsIntakeStatus;
  q?: string;
  sourceProvider?: RightsSourceProvider;
  targetLanguage?: string;
  attentionOnly?: boolean;
  includeSummary?: boolean;
}

export interface RightsAgentManifest {
  manifestVersion: string;
  manifestType: 'BIBLIARIS_RIGHTS_CLEARANCE_INPUT';
  generatedAt: string;
  generatedBy: {
    product: string;
    module: string;
  };
  intake: {
    id: string;
    workflowStatus: string;
    candidateTitle: string;
    candidateAuthor: string;
    originalTitle: string | null;
    originalLanguage: string | null;
    authorBirthYear: number | null;
    authorDeathYear: number | null;
    notesRu: string | null;
  };
  source: {
    provider: RightsSourceProvider;
    externalId: string | null;
    url: string | null;
    title: string | null;
    language: string | null;
    textType: RightsSourceTextType;
  };
  publicationPlan: {
    targetLanguages: string[];
    targetCountryCodes: string[];
    plannedContentTypes: string[];
    plannedComponents: string[];
  };
  agentTask: {
    objective: string;
    requiredChecks: string[];
    requiredOutputs: string[];
    importantRules: string[];
  };
  expectedResultSchema: {
    schemaVersion: string;
    format: 'json';
    requiredTopLevelFields: string[];
    notes: string[];
  };
}

export type RightsReviewStatus =
  | 'DRAFT'
  | 'AGENT_COMPLETED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'HUMAN_APPROVED'
  | 'HUMAN_REJECTED'
  | 'SUPERSEDED'
  | 'STALE'
  // Phase 19: юридическая проверка
  | 'LAWYER_REVIEW_REQUIRED'
  | 'LAWYER_APPROVED';

export type RightsReviewImportStatus = 'VALIDATED' | 'VALIDATION_FAILED' | 'SUPERSEDED';

export interface ValidationIssue {
  path: string;
  message: string;
  code: string;
}

export interface RightsReviewImportListItem {
  id: string;
  rightsIntakeId: string;
  schemaVersion: string | null;
  importStatus: RightsReviewImportStatus;
  isCurrent: boolean;
  sourceFileName: string | null;
  validationErrorsCount: number;
  validationWarningsCount: number;
  importedByUserId: string | null;
  supersededAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsReviewImportDetail extends RightsReviewImportListItem {
  reportJson: unknown;
  reportMarkdown: string | null;
  rawAgentOutput: string | null;
  reportJsonSha256: string | null;
  reportMarkdownSha256: string | null;
  rawAgentOutputSha256: string | null;
  validationErrors: ValidationIssue[] | null;
  validationWarnings: ValidationIssue[] | null;
  // WP-9.2: PDF-версия отчёта. Файл приватный — публичного URL у него нет, скачивается
  // только через `GET /admin/rights/review-imports/:importId/report-pdf`.
  hasReportPdf?: boolean;
  reportPdfSha256?: string | null;
  reportPdfFileName?: string | null;
  reportPdfContentType?: string | null;
  reportPdfSizeBytes?: number | null;
  reportPdfUploadedAt?: string | null;
  // WP-9: происхождение отчёта — по чему и чем он был получен.
  inputManifestSha256?: string | null;
  inputManifestVersion?: string | null;
  promptVersion?: string | null;
  agentModel?: string | null;
}

export interface RightsReviewImportsListResponse {
  items: RightsReviewImportListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateRightsReviewImportRequest {
  reportJson: Record<string, unknown>;
  reportMarkdown?: string | null;
  rawAgentOutput?: string | null;
  sourceFileName?: string | null;
  /** WP-9: модель агента, выдавшего отчёт (до 120 символов). */
  agentModel?: string | null;
}

export interface ListRightsReviewImportsParams {
  page?: number;
  limit?: number;
  status?: RightsReviewImportStatus;
}

/**
 * WP-9: дескриптор приватного юридического файла, ответ на успешную загрузку.
 *
 * Публичного URL у файла нет и быть не может: `storageKey` — внутренний ключ хранилища,
 * скачивание идёт только админскими эндпоинтами под ролями Admin/ContentManager.
 */
export interface RightsFileDescriptor {
  storageKey: string;
  sha256: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
}

/** WP-9: то, что карточка файла показывает редактору — дескриптор без ключа хранилища. */
export interface RightsFileMeta {
  sha256: string | null;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
}

/** WP-9: `GET /admin/rights/files/limits`. */
export interface RightsFileLimits {
  maxSizeMb: number;
  allowedContentTypes: {
    reportPdf: string[];
    sourceFile: string[];
    evidence: string[];
  };
}

/** WP-9.3: пометка доказательства заменённым — единственный способ сказать «оно не действует». */
export interface SupersedeRightsEvidenceRequest {
  supersededById: string;
}

export interface SupersedeRightsEvidenceResponse {
  id: string;
  isCurrent: boolean;
  supersededById: string;
}

export type RightsProfileStatus =
  | 'IMPORTED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'STALE'
  | 'ARCHIVED'
  // Phase 19: юридическая проверка
  | 'LAWYER_REVIEW_REQUIRED'
  | 'LAWYER_APPROVED';
export type RightsOverallStatus =
  | 'PUBLISHABLE'
  | 'PUBLISHABLE_AFTER_CHANGES'
  | 'PUBLISHABLE_WITH_GEO_RESTRICTIONS'
  | 'LICENSE_REQUIRED'
  | 'INSUFFICIENT_DATA'
  | 'REJECTED';
export type RightsPublicationGate = 'ALLOW' | 'ALLOW_AFTER_GEO_CONFIGURATION' | 'BLOCK';
export type RightsConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type RightsAccessPolicy = 'ALLOW' | 'BLOCK' | 'REVIEW_REQUIRED';

export interface SourceEdition {
  id: string;
  rightsProfileId: string;
  provider: string;
  externalId: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceLanguage: string | null;
  sourceTextType: string;
  gutenbergStatus: string | null;
  status: string;
  notesRu: string | null;
  editionRights: EditionRights[];
  // WP-8.3: файл исходного издания. Его контрольная сумма входит в content hash клиренса,
  // поэтому загрузка помечает версии профиля требующими перепроверки.
  hasSourceFile?: boolean;
  sourceFileSha256?: string | null;
  sourceFileName?: string | null;
  sourceFileContentType?: string | null;
  sourceFileSizeBytes?: number | null;
  sourceFileUploadedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** WP-7.1: права одной языковой версии издания — одна запись на язык. */
export interface EditionRights {
  id: string;
  sourceEditionId: string;
  languageCode: string;
  status: string;
  notesRu: string | null;
  legalBasisRu: string | null;
  translationOrigin: string;
  translationSourceLanguage: string | null;
  requiresGeoBlock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RightsReview {
  id: string;
  rightsProfileId: string;
  rightsReviewImportId: string;
  status: string;
  schemaVersion: string | null;
  reviewerType: string;
  overallStatus: string;
  publicationGate: string;
  confidence: string;
  summaryRu: string;
  conclusionRu: string;
  reasoningRu: string | null;
  nextReviewAt: string | null;
  // Phase 18: review history chain
  previousReviewId?: string | null;
  chainRootReviewId?: string | null;
  revisionNumber?: number;
  // Phase 19: lawyer approval snapshot
  lawyerReviewRequired?: boolean;
  lawyerReviewId?: string | null;
  lawyerApprovedAt?: string | null;
  lawyerNameSnapshot?: string | null;
  approvedByUserId: string | null;
  approvedByUser: { id: string; name?: string; email: string } | null;
  approvedAt: string | null;
  approvalNotesRu: string | null;
  rejectedByUserId: string | null;
  rejectedByUser: { id: string; name?: string; email: string } | null;
  rejectedAt: string | null;
  rejectionReasonRu: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentTerritoryAssessment {
  id: string;
  rightsComponentId: string;
  countryCode: string;
  status: string;
  accessPolicy: string;
  geoBlockRequired: boolean;
  reasonRu: string | null;
  legalBasisRu: string | null;
  publicDomainFromYear: number | null;
  rightsExpireAt: string | null;
  sourceEvidenceIds: string[] | null;
  confidence: string | null;
  notesRu: string | null;
  /** Phase 15: license that justified this country, when the status is ALLOWED_BY_LICENSE. */
  licenseId?: string | null;
  licenseTitle?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsComponent {
  id: string;
  rightsProfileId: string;
  componentType: string;
  titleRu: string;
  /** WP-7.2: `null` — компонент общий для всех языков версии. */
  languageCode?: string | null;
  status: string;
  requiredAction: string;
  confidence: string;
  notesRu: string | null;
  territoryAssessments: ComponentTerritoryAssessment[];
  /** Phase 15: licenses linked to this component or to its country assessments. */
  licenses?: import('./rights-licenses').RightsLicenseSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface TerritoryDecision {
  id: string;
  rightsProfileId: string;
  countryCode: string;
  finalStatus: string;
  accessPolicy: string;
  geoBlockRequired: boolean;
  geoBlockScope: string | null;
  reasonRu: string;
  legalBasisRu: string | null;
  confidence: string;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsEvidence {
  id: string;
  rightsProfileId: string;
  evidenceType: string;
  sourceLevel: string;
  title: string;
  authority: string;
  url: string | null;
  jurisdictionCode: string | null;
  accessedAt: string | null;
  relevantExcerpt: string | null;
  summaryRu: string;
  // WP-9.3: архивная копия документа. Внешний URL завтра отдаст 404 вместе с обоснованием
  // блокировки страны, поэтому копию загружает редактор — сервер по внешним адресам не ходит.
  isArchivedCopy?: boolean;
  fileSha256?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  archivedAt?: string | null;
  /** `false` — доказательство заменено другим (удалить его нельзя, ADR-009). */
  isCurrent?: boolean;
  supersededById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsAction {
  id: string;
  rightsProfileId: string;
  actionType: string;
  status: string;
  descriptionRu: string;
  affectedCountryCodes: unknown;
  isBlocking: boolean;
  // WP-5.1: жизненный цикл действия — кто взял, к какому сроку, кто и когда закрыл.
  assignedToUserId: string | null;
  dueAt: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  completionNotesRu: string | null;
  /** Закрыто ли действие: `COMPLETED` или `WAIVED`. `CANCELLED` закрытым не считается. */
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

/** WP-5.2: изменение действия человеком. Комментарий обязателен при `WAIVED`. */
export interface UpdateRightsActionRequest {
  status?: string;
  completionNotesRu?: string;
  assignedToUserId?: string | null;
  dueAt?: string | null;
}

export interface RightsProfileSummary {
  id: string;
  rightsIntakeId: string;
  currentReviewImportId: string | null;
  status: string;
  isCurrent: boolean;
  overallStatus: string;
  publicationGate: string;
  confidence: string;
  summaryRu: string;
  conclusionRu: string;
  reasoningRu: string | null;
  nextReviewAt: string | null;
  supersededAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RegionalRightsStatus =
  | 'ALLOWED'
  | 'BLOCKED'
  | 'LICENSE_REQUIRED'
  | 'PENDING_REVIEW'
  | 'NOT_TARGETED'
  | 'MIXED';

export interface TerritoryRegionCountry {
  countryCode: string;
  finalStatus: string;
  accessPolicy: string;
  geoBlockRequired: boolean;
  geoBlockScope: string | null;
  reasonRu: string;
  legalBasisRu: string | null;
  confidence: string;
  nextReviewAt: string | null;
}

export interface TerritoryRegionReason {
  countryCode: string;
  finalStatus: string;
  accessPolicy: string;
  reasonRu: string;
  legalBasisRu: string | null;
}

export interface TerritoryRegionSummary {
  regionCode: string;
  label: string;
  status: RegionalRightsStatus;
  countryCount: number;
  targetedCountryCount: number;
  allowedCountryCount: number;
  /** Phase 15: subset of allowed countries cleared by a license. */
  licensedCountryCount?: number;
  blockedCountryCount: number;
  licenseRequiredCountryCount: number;
  pendingReviewCountryCount: number;
  notTargetedCountryCount: number;
  geoBlockRequiredCount: number;
  countries: TerritoryRegionCountry[];
  blockingReasons: TerritoryRegionReason[];
}

export interface RightsProfileDetail {
  id: string;
  rightsIntakeId: string;
  currentReviewImportId: string | null;
  status: string;
  isCurrent: boolean;
  overallStatus: string;
  publicationGate: string;
  confidence: string;
  summaryRu: string;
  conclusionRu: string;
  reasoningRu: string | null;
  nextReviewAt: string | null;
  sourceEdition: SourceEdition | null;
  reviews: RightsReview[];
  territoryDecisions: TerritoryDecision[];
  regionalTerritorySummary?: TerritoryRegionSummary[];
  components: RightsComponent[];
  evidence: RightsEvidence[];
  actions: RightsAction[];
  contributors?: import('../contributors').RightsProfileContributor[];
  contributorsCount?: number;
  authorsCount?: number;
  translatorsCount?: number;
  narratorsCount?: number;
  contributorsWithoutPersonCount?: number;
  // Phase 15: licenses reachable from this profile and their coverage of license-gated markets
  licenses?: import('./rights-licenses').RightsLicenseSummary[];
  licenseCoverage?: import('./rights-licenses').LicenseCoverageResult | null;
  licensesCount?: number;
  activeLicensesCount?: number;
  expiredLicensesCount?: number;
  revokedLicensesCount?: number;
  expiringSoonLicensesCount?: number;
  licenseRequiredCountriesCount?: number;
  licenseCoveredCountriesCount?: number;
  licenseUncoveredCountriesCount?: number;
  // Phase 19: снимок оценки риска и юридического утверждения
  riskLevel?: import('./rights-lawyer').RightsRiskLevel;
  riskFactors?: import('./rights-lawyer').RiskFactor[];
  riskAssessedAt?: string | null;
  lawyerReviewRequired?: boolean;
  lawyerReviewBlocking?: boolean;
  currentLawyerReviewId?: string | null;
  lawyerApprovedAt?: string | null;
  lawyerApprovedLawyerName?: string | null;
  lawyerOpinionValidUntil?: string | null;
  supersededAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RightsProfileList {
  items: RightsProfileSummary[];
  total: number;
}

export interface RightsApprovalDecision {
  id: string;
  rightsReviewId: string;
  rightsProfileId: string;
  rightsIntakeId: string;
  decision: 'APPROVED' | 'REJECTED';
  decidedByUser: {
    id: string;
    name?: string;
    email: string;
  } | null;
  notesRu?: string;
  createdAt: string;
}

export interface RightsReviewApprovalFields {
  approvedByUserId?: string;
  approvedByUser?: { id: string; name?: string; email: string } | null;
  approvedAt?: string;
  approvalNotesRu?: string;
  rejectedByUserId?: string;
  rejectedByUser?: { id: string; name?: string; email: string } | null;
  rejectedAt?: string;
  rejectionReasonRu?: string;
  approvals?: RightsApprovalDecision[];
}

// Phase 8: Content Hash
export interface RightsContentHashCheck {
  versionId: string;
  baselineHash: string | null;
  currentHash: string;
  algorithmVersion: string;
  matchesBaseline: boolean;
  isStale: boolean;
  recheckRequired: boolean;
  reasonCode: string | null;
  reasonRu: string | null;
  checkedAt: string;
}

// Phase 7: Publication Gate
export type PublicationGateSeverity = 'BLOCKER' | 'WARNING';

export interface PublicationGateReason {
  code: string;
  severity: PublicationGateSeverity;
  messageRu: string;
  messageEn?: string;
  details?: Record<string, unknown>;
}

export interface PublicationGateResult {
  versionId: string;
  bookId: string;
  canPublish: boolean;
  checkedAt: string;
  rightsProfileId: string | null;
  approvedRightsReviewId: string | null;
  rightsStatus: string | null;
  blockingReasons: PublicationGateReason[];
  warnings: PublicationGateReason[];
  contentHashBaseline: string | null;
  contentHashCurrent: string | null;
  contentHashMatches: boolean | null;
  rightsRecheckRequired: boolean;
  // Phase 15: license coverage of the markets that require a license
  licenseCoverageStatus?: string | null;
  licenseRequiredCountryCodes?: string[];
  licenseCoveredCountryCodes?: string[];
  licenseUncoveredCountryCodes?: string[];
  licenseIds?: string[];
  // Phase 16: rights claims / DMCA
  activeClaimsCount?: number;
  blockingClaimsCount?: number;
  criticalClaimsCount?: number;
  overdueClaimsCount?: number;
  claimBlockedCountryCodes?: string[];
  hasWorldwideClaimBlock?: boolean;
  worstClaimSeverity?: string | null;
  claimIds?: string[];
  // Phase 18: automatic recheck
  openRecheckTasksCount?: number;
  overdueRecheckTasksCount?: number;
  blockingRecheckTasksCount?: number;
  nextRecheckDueAt?: string | null;
  recheckTaskIds?: string[];
}

export interface UpdateRightsGeoBlockRequest {
  configured: boolean;
  notesRu?: string | null;
}

// Phase 6: Create Book from Approved Clearance
export interface CreateBookFromClearanceVersion {
  language: string;
  title: string;
  author: string;
  description: string;
  coverImageUrl: string;
  type: string;
  isFree: boolean;
  referralUrl?: string | null;
  primaryCategoryId?: string | null;
  firstPublishedYear?: number | null;
  editionPublishedYear?: number | null;
  originalLanguage?: string | null;
  originalTitle?: string | null;
  copyrightStatus?: string | null;
  authorPageUrl?: string | null;
  authorId?: string | null;
  shortDescription?: string | null;
  summaryShort?: string | null;
  coverAlt?: string | null;
}

export interface CreateBookFromClearanceRequest {
  slug: string;
  versions: CreateBookFromClearanceVersion[];
}

export interface CreateBookFromClearanceResponse {
  book: {
    id: string;
    slug: string;
    rightsIntakeId: string | null;
    currentRightsProfileId: string | null;
    approvedRightsReviewId: string | null;
    rightsCreatedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  versions: Array<{
    id: string;
    bookId: string;
    language: string;
    title: string;
    status: string;
    rightsStatus: string | null;
  }>;
  rightsProfileId: string;
  approvedRightsReviewId: string;
}
