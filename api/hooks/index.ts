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
  useUpdateBook,
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
export { summaryKeys, useBookSummary, useUpsertBookSummary } from './useBookSummary';

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
} from './usePublic';

// Bookshelf
export { useBookshelf, useAddToBookshelf, useRemoveFromBookshelf } from './useBookshelf';

// Authors
export {
  authorKeys,
  useAuthors,
  useAuthor,
  usePublicAuthor,
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
