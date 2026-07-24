export type RightsIntakeStatus =
  | 'DRAFT'
  | 'READY_FOR_AGENT'
  | 'REVIEW_IMPORTED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'BOOK_CREATED'
  | 'ARCHIVED';

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

export interface RightsIntakesListResponse {
  items: RightsIntake[];
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
  | 'STALE';

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
}

export interface ListRightsReviewImportsParams {
  page?: number;
  limit?: number;
  status?: RightsReviewImportStatus;
}

export type RightsProfileStatus =
  | 'IMPORTED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'STALE'
  | 'ARCHIVED';
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
  editionRights: EditionRights | null;
  createdAt: string;
  updatedAt: string;
}

export interface EditionRights {
  id: string;
  sourceEditionId: string;
  status: string;
  notesRu: string | null;
  legalBasisRu: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface RightsComponent {
  id: string;
  rightsProfileId: string;
  componentType: string;
  titleRu: string;
  status: string;
  requiredAction: string;
  confidence: string;
  notesRu: string | null;
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
  createdAt: string;
  updatedAt: string;
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
  components: RightsComponent[];
  evidence: RightsEvidence[];
  actions: RightsAction[];
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
