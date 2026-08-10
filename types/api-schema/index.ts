/**
 * API Schema Types
 *
 * Temporary types for working with API until generation from OpenAPI.
 * TODO (M2): Replace with auto-generated types from production API
 *
 * @see https://api.bibliaris.com/docs-json (when available)
 */

// Common types
export type {
  ISODate,
  ImportResult,
  PageType,
  PaginatedResponse,
  PaginationMeta,
  PublicationStatus,
  RoleName,
  SupportedLang,
  UUID,
  VersionType,
} from './common';

// Auth
export type {
  AuthResponse,
  LoginRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
} from './auth';

// User
export type {
  UserMeResponse,
  UpdateProfileRequest,
  UserActivityBookVersion,
  UserActivityParentOrChildComment,
  UserActivity,
} from './user';

// Books
export type {
  BookCardModel,
  BookCardsResponse,
  BookOverview,
  BookSummaryDetail,
  BookVersion,
  BookVersionDetail,
  CreateBookRequest,
  CreateBookResponse,
  CreateBookVersionRequest,
  RelatedBooksResponse,
  UpdateBookVersionRequest,
  UpsertBookSummaryRequest,
  VersionPreview,
} from './books';

// Chapters (text)
export type {
  Chapter,
  ChapterDetail,
  CreateChapterRequest,
  ReorderChaptersRequest,
  UpdateChapterRequest,
} from './chapters';

// Audio Chapters
export type {
  AudioChapter,
  AudioChapterDetail,
  AudioChaptersListResponse,
  CreateAudioChapterRequest,
  GetAudioChaptersParams,
  ReorderAudioChaptersRequest,
  UpdateAudioChapterRequest,
} from './audioChapters';

// Categories
export type {
  AttachCategoryRequest,
  Category,
  CategoryBookCardsResponse,
  CategoryBooksResponse,
  CategoryTranslation,
  CategoryTree,
  CategoryType,
  CreateCategoryRequest,
  CreateCategoryTranslationRequest,
  DetachCategoryRequest,
  UpdateCategoryRequest,
  UpdateCategoryTranslationRequest,
} from './categories';

// Tags
export type {
  AttachTagRequest,
  CreateTagRequest,
  CreateTagTranslationRequest,
  DetachTagRequest,
  RelatedTerm,
  RelatedTerms,
  Tag,
  TagBookCardsResponse,
  TagBooksResponse,
  TagTranslation,
  UpdateTagRequest,
  UpdateTagTranslationRequest,
} from './tags';

// Media
export type {
  GetMediaParams,
  MediaResponse,
  UploadMediaResponse,
  MediaFile,
  MediaType,
} from './media';

// Uploads
export type {
  ConfirmUploadRequest,
  MediaAsset,
  PresignUploadRequest,
  PresignUploadResponse,
  UploadAssetType,
  UploadLimits,
  UploadLimitsCategory,
  UploadsConfirmResponse,
} from './uploads';

// Pages (CMS)
export type {
  BookCollection,
  BookCollectionData,
  BookCollectionPosition,
  BookCollectionTaxonomy,
  CreatePageRequest,
  PageGroup,
  PageResponse,
  PageTranslation,
  SeoData,
  SeoInput,
  SeoResolveRequest,
  SeoResolveResponse,
  UpdatePageRequest,
} from './pages';

// Bookshelf & Reading Progress
export type {
  AddToBookshelfRequest,
  BookshelfItem,
  ReadingProgress,
  UpdateAudioProgressRequest,
  UpdateProgressRequest,
} from './bookshelf';

// Views
export type { RecordViewRequest, ViewSource } from './views';

// Comments
export type {
  Comment,
  CommentStatus,
  GetCommentsParams,
  CommentsResponse,
  ModerateCommentRequest,
  CreateReplyRequest,
  CommentAuthor,
  CommentUser,
  ClientComment,
  CreateCommentRequest,
  GetBookCommentsParams,
  BookCommentsResponse,
  ToggleLikeRequest,
  ToggleLikeResponse,
  LikeCountResponse,
} from './comments';

// Authors
export type {
  Author,
  AuthorFaq,
  AuthorListItem,
  AuthorQuote,
  AuthorTranslation,
  PublicAuthorDetail,
  CreateAuthorRequest,
  UpdateAuthorRequest,
  CheckAuthorSlugResponse,
} from './authors';

// Rights Intakes
export type {
  RightsIntake,
  RightsIntakeStatus,
  RightsSourceProvider,
  RightsSourceTextType,
  RightsIntakesListResponse,
  CreateRightsIntakeRequest,
  UpdateRightsIntakeRequest,
  ChangeRightsIntakeStatusRequest,
  GetRightsIntakesParams,
} from './rights-intake';

// GeoIP market blocking
export type {
  CheckGeoBlockAccessRequest,
  GeoAccessCheckResult,
  GeoBlockRule,
  GeoBlockRulesResponse,
  GeoBlockRulesSummary,
  GeoBlockScope,
  VerifyGeoBlockRulesRequest,
} from './geo-block';

// Rights Licenses (Phase 15)
export type {
  CountryCoverageResult,
  CreateRightsLicenseRequest,
  LicenseCoverageResult,
  LicenseCoverageStatus,
  LicenseIssue,
  LinkRightsLicenseRequest,
  QueryRightsLicensesParams,
  RevokeRightsLicenseRequest,
  RightsLicense,
  RightsLicenseEvent,
  RightsLicenseEventType,
  RightsLicenseLink,
  RightsLicenseLinkType,
  RightsLicenseMediaFormat,
  RightsLicenseStatus,
  RightsLicenseSummary,
  RightsLicenseTerritoryScope,
  RightsLicenseType,
  RightsLicensesListResponse,
  UpdateRightsLicenseRequest,
} from './rights-licenses';

// Automatic Recheck (Phase 18)
export type {
  CompleteRecheckTaskRequest,
  CreateLegalChangeRequest,
  CreateRecheckTaskRequest,
  DismissRecheckTaskRequest,
  ListLegalChangesParams,
  ListRecheckTasksParams,
  ListScanRunsParams,
  RightsLegalChange,
  RightsLegalChangeDetail,
  RightsLegalChangeStatus,
  RightsLegalChangeType,
  RightsLegalChangesListResponse,
  RightsRecheckEvent,
  RightsRecheckEventType,
  RightsRecheckGateReason,
  RightsRecheckPolicy,
  RightsRecheckReason,
  RightsRecheckReminderStage,
  RightsRecheckResolution,
  RightsRecheckScanRun,
  RightsRecheckScanRunsListResponse,
  RightsRecheckScanStatus,
  RightsRecheckSchedule,
  RightsRecheckScheduleWithTasks,
  RightsRecheckSeverity,
  RightsRecheckStatus,
  RightsRecheckTask,
  RightsRecheckTaskDetail,
  RightsRecheckTaskTargets,
  RightsRecheckTasksListResponse,
  RightsRecheckTriggerSource,
  RightsReviewChainDiff,
  RightsReviewChainItem,
  RightsReviewChainResponse,
  SnoozeRecheckTaskRequest,
  UpdateLegalChangeRequest,
  UpdateRecheckScheduleRequest,
  VersionRecheckEvaluation,
} from './rights-recheck';
