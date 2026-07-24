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
