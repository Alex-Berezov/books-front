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
  useCreateBook,
  useDeleteBook,
  useUpdateBook,
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
} from './useBookVersions';

// Book Summaries
export { summaryKeys, useBookSummary, useUpsertBookSummary } from './useBookSummary';

// Chapters
export {
  chapterKeys,
  useChapters,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useReorderChapters,
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
  useUpdateCommentStatus,
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
export { userKeys, useUsers } from './useUsers';
export { useMe, useUpdateProfile, useUserActivities, useUploadAvatar } from './useAuth';

// Progress
export { useProgress, useUpdateTextProgress } from './useProgress';

// Public Chapters & Books
export { usePublicChapters, usePublicBooks } from './usePublic';

// Bookshelf
export { useBookshelf, useAddToBookshelf, useRemoveFromBookshelf } from './useBookshelf';

// Authors
export {
  authorKeys,
  useAuthors,
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
} from './useRightsIntakes';
