/**
 * Barrel export for all admin hooks
 *
 * Exports all hooks from individual files for convenient import.
 */

// Books
export {
  bookKeys,
  useBook,
  useBooks,
  useDeleteBook,
  useUserBookRating,
  useThemes,
} from './useBooks';

// Book Versions
export {
  versionKeys,
  useBookVersion,
  useCreateBookVersion,
  useUpdateBookVersion,
  usePublishVersion,
  useUnpublishVersion,
  useUpsertVersionSeo,
  usePublicationGate,
  useUpdateVersionRightsGeoBlock,
  useGeoBlockRules,
  useGenerateGeoBlockRules,
  useCheckGeoBlockAccess,
  useVerifyGeoBlockRules,
  useVersionRightsContentHash,
  useCheckVersionRightsContentHash,
  useVersionRightsDashboard,
} from './useBookVersions';

// Book Version Contributors
export {
  useBookVersionContributors,
  useAddBookVersionContributor,
  useUpdateBookVersionContributor,
  useRemoveBookVersionContributor,
  useReorderBookVersionContributors,
} from './useBookVersionContributors';

// Contributors (persons/organizations attached to source editions and rights components)
export {
  CONTRIBUTOR_KEYS,
  useContributors,
  useContributor,
  useCreateContributor,
  useUpdateContributor,
  useDeleteContributor,
  useLinkSourceEditionContributor,
  useUnlinkSourceEditionContributor,
  useLinkRightsComponentContributor,
  useUnlinkRightsComponentContributor,
} from './useContributors';

// Persons
export {
  usePersons,
  usePersonSearch,
  usePerson,
  useCreatePerson,
  useUpdatePerson,
} from './usePersons';

// Book Summaries
export {
  summaryKeys,
  useBookSummary,
  useBookSummarySection,
  useBookSummarySectionMutations,
  useBookSummarySections,
  useUpsertBookSummary,
  useUpsertBookSummaryBrief,
} from './useBookSummary';
export {
  analysisKeys,
  useBookAnalysis,
  useChapterTitles,
  useSaveBookAnalysis,
} from './useBookAnalysis';

// Chapters
export {
  chapterKeys,
  useChapters,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
} from './useChapters';

// Audio Chapters
export {
  audioChapterKeys,
  useAllAudioChapters,
  useAudioChapter,
  useAudioChapters,
  useCreateAudioChapter,
  useDeleteAudioChapter,
  useReorderAudioChapters,
  useUpdateAudioChapter,
} from './useAudioChapters';

// Uploads
export { uploadsKeys, useUploadsLimits } from './useUploadsLimits';

// Public audio (player)
export {
  publicAudioKeys,
  usePublicAudioChapters,
  useRecordView,
  useUpdateAudioProgress,
} from './usePublicAudio';

// Categories
export {
  categoryKeys,
  useCategories,
  useCategoriesTree,
  useAttachCategory,
  useDetachCategory,
  useCategoryTranslations,
  useCreateCategory,
  useCreateCategoryTranslation,
  useUpdateCategory,
  useUpdateCategoryTranslation,
  useDeleteCategory,
  useImportCategories,
  useDeleteCategoryTranslation,
} from './useCategories';

// Tags
export * from './useTags';
export * from './useMedia';

// CMS Pages
export {
  pageKeys,
  usePages,
  usePage,
  usePageGroup,
  useCreatePage,
  useUpdatePage,
  usePublishPage,
  useUnpublishPage,
  useDeletePage,
} from './usePages';
export {
  commentKeys,
  useComments,
  useModerateComment,
  useDeleteComment,
  useReplyToComment,
} from './useComments';

// Client-facing book reviews, comments, and reactions
export {
  bookCommentsKeys,
  useBookComments,
  useCreateBookComment,
  useUpdateBookComment,
  useDeleteBookComment,
  useToggleCommentReaction,
  useCommentLikes,
} from './useBookComments';

// Users
export {
  userKeys,
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useAssignRole,
  useRevokeRole,
  useResetPassword,
} from './useUsers';
export { useMe, useUpdateProfile, useUserActivities, useUploadAvatar } from './useAuth';

// Progress
export { useProgress, useUpdateTextProgress } from './useProgress';

// Public Chapters & Books
//
// `usePage as usePublicPage`: usePages.ts (admin CMS page by id) and usePublic.ts
// (public page by lang+slug) both declare `usePage`. The public one is aliased here
// so both are reachable from the barrel; the hook keeps its own name in its file.
export {
  usePublicChapters,
  usePublicBooks,
  useBookOverview,
  usePage as usePublicPage,
  useCategoryBooks,
  useTagBooks,
  useSeoResolve,
  useReaderBootstrap,
  usePublicTags,
  useAuthorAllBookCards,
} from './usePublic';

// Bookshelf
export { useBookshelf, useAddToBookshelf, useRemoveFromBookshelf } from './useBookshelf';

// Authors
export {
  authorKeys,
  useAuthors,
  useAuthor,
  useAuthorPromptInputs,
  useCreateAuthor,
  useUpdateAuthor,
  useDeleteAuthor,
} from './useAuthors';

// Rights Intakes
export {
  rightsIntakeKeys,
  useRightsIntakes,
  useRightsIntake,
  useCreateRightsIntake,
  useUpdateRightsIntake,
  useChangeRightsIntakeStatus,
  useArchiveRightsIntake,
  useUpdateRightsAction,
} from './useRightsIntakes';

// Rights Licenses (Phase 15)
export {
  rightsLicenseKeys,
  useRightsLicenses,
  useRightsLicense,
  useProfileLicenses,
  useProfileLicenseCoverage,
  useVersionLicenseCoverage,
  useCreateRightsLicense,
  useUpdateRightsLicense,
  useRevokeRightsLicense,
  useLinkRightsLicense,
  useUnlinkRightsLicense,
} from './useRightsLicenses';

// Rights Agent (submission tokens and notifications)
export {
  rightsAgentKeys,
  useRightsAgentTokens,
  useCreateRightsAgentToken,
  useRevokeRightsAgentToken,
  useRightsAgentSubmissions,
  useRightsAgentSubmission,
  useRightsNotifications,
  useRightsNotificationsUnreadCount,
  useMarkRightsNotificationRead,
  useMarkAllRightsNotificationsRead,
} from './useRightsAgent';

// Rights Claims
export {
  rightsClaimKeys,
  useRightsClaims,
  useRightsClaim,
  useVersionRightsClaims,
  useBookRightsClaims,
  useCreateRightsClaim,
  useUpdateRightsClaim,
  useChangeRightsClaimStatus,
  useAssignRightsClaim,
  useRecordClaimResponse,
  useRecordCounterNotice,
  useResolveRightsClaim,
  useReopenRightsClaim,
  useApplyClaimBlock,
  useLiftClaimBlock,
  useLinkClaimComponent,
  useUnlinkClaimComponent,
  useAddClaimAttachment,
  useRemoveClaimAttachment,
} from './useRightsClaims';

// Rights Files (uploads, evidence)
export {
  rightsFileKeys,
  useRightsFileLimits,
  useUploadRightsReportPdf,
  useUploadRightsSourceFile,
  useUploadRightsEvidenceArchiveCopy,
  useSupersedeRightsEvidence,
} from './useRightsFiles';

// Rights Lawyer (legal review)
export {
  rightsLawyerKeys,
  useLawyers,
  useLawyer,
  useLawyerReviews,
  useLawyerReview,
  useIntakeLawyerReviews,
  useProfileRiskAssessment,
  useVersionLawyerReview,
  useLegalOpinions,
  useCreateLawyer,
  useUpdateLawyer,
  useDeactivateLawyer,
  useActivateLawyer,
  useRequestLawyerReview,
  useRequireLawyerReviewForProfile,
  useAssignLawyerReview,
  useStartLawyerReview,
  useDecideLawyerReview,
  useWithdrawLawyerReview,
  useReopenLawyerReview,
  useAddLawyerReviewNote,
  useAttachLegalOpinion,
  useArchiveLegalOpinion,
  useAddLawyerCondition,
  useSatisfyLawyerCondition,
  useWaiveLawyerCondition,
  useRunLawyerExpiryScan,
} from './useRightsLawyer';

// Rights Recheck
export {
  rightsRecheckKeys,
  useRightsRecheckTasks,
  useRightsRecheckTask,
  useIntakeRecheckTasks,
  useRecheckSchedule,
  useVersionRecheck,
  useReviewChain,
  useRecheckScanRuns,
  useRightsLegalChanges,
  useRightsLegalChange,
  useCreateRightsRecheckTask,
  useStartRightsRecheckTask,
  useCompleteRightsRecheckTask,
  useDismissRightsRecheckTask,
  useSnoozeRightsRecheckTask,
  useReopenRightsRecheckTask,
  useUpdateRecheckSchedule,
  useRunRecheckScan,
  useCreateRightsLegalChange,
  useUpdateRightsLegalChange,
  useApplyRightsLegalChange,
  useArchiveRightsLegalChange,
} from './useRightsRecheck';

// Rights publication override (admin last resort)
export {
  rightsOverrideKeys,
  useRightsOverride,
  useGrantRightsOverride,
  useRevokeRightsOverride,
} from './useRightsOverride';

// LLM pipeline settings (F05-1s, admin only)
export {
  llmKeys,
  useLlmStatus,
  useLlmModels,
  useLlmStageSettings,
  useUpdateLlmStageSetting,
  useUpdateLlmBudget,
} from './useLlmSettings';

// Translation compare of models on a chapter (F05-3, admin only)
export {
  COMPARE_MAX_MODELS,
  COMPARE_MIN_MODELS,
  COMPARE_REFETCH_MS,
  compareRefetchInterval,
  LLM_DISABLED,
  translationCompareKeys,
  useCompareOperation,
  useStartTranslationCompare,
  useTranslationCompare,
  useTranslationCompareEstimate,
  useTranslationCompares,
} from './useTranslationCompare';

// Translation run over the whole book (F05-7, admin only)
export {
  RUN_HISTORY_PAGE_SIZE,
  RUN_MAX_LANGUAGES,
  translationRunKeys,
  translationRunRefetchInterval,
  useStartTranslationRun,
  useTranslationRun,
  useTranslationRunActions,
  useTranslationRunEstimate,
  useTranslationRunHistory,
  useTranslationRunReport,
  useTranslationSource,
  useVersionTranslationRuns,
} from './useTranslationRun';

// Pieces of a translation run: original | translation, retry, edit (F05-7v, admin only)
export {
  chunksRefetchInterval,
  translationChunkKeys,
  useTranslationChunkActions,
  useTranslationChunks,
} from './useTranslationChunks';
export type { TranslationChunkActions } from './useTranslationChunks';

// Book dossier and language glossary, read only (F05-2, F05-7v, admin only)
export {
  DOSSIER_REFETCH_MS,
  dossierKeys,
  dossierRefetchInterval,
  useDossierEstimate,
  useDossierGlossary,
  useVersionDossier,
} from './useDossier';

// Summary drafts from the dossier (F05-10, admin only)
export {
  CONTENT_DRAFT_LOCAL_CODES,
  CONTENT_DRAFT_REFETCH_MS,
  contentDraftKeys,
  contentDraftRefetchInterval,
  useContentDraft,
  useContentDraftActions,
  useContentDraftEstimate,
} from './useContentDraft';
export type { ContentDraftActions } from './useContentDraft';

// Rights Intakes (continued: review imports, profile, agent manifest)
export {
  useMaterializeRightsReviewImport,
  useCurrentRightsProfile,
  useRightsProfile,
  useRightsAgentManifest,
  useRightsIntakeReadiness,
  useForceArchiveRightsIntake,
  useRightsReviewImports,
  useRightsReviewImportDetail,
  useCreateRightsReviewImport,
  useApproveRightsReview,
  useRejectRightsReview,
  useRightsIntakeApprovals,
  useCreateBookFromClearance,
} from './useRightsIntakes';
