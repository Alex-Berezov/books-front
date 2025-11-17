/**
 * Barrel export for all admin hooks
 *
 * Exports all hooks from individual files for convenient import.
 */

// Books
export { bookKeys, useBooks, useCreateBook, useDeleteBook } from './useBooks';

// Book Versions
export {
  versionKeys,
  useBookVersion,
  useCreateBookVersion,
  useUpdateBookVersion,
  usePublishVersion,
  useUnpublishVersion,
} from './useBookVersions';

// Chapters
export {
  chapterKeys,
  useChapters,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useReorderChapters,
} from './useChapters';

// Categories
export {
  categoryKeys,
  useCategories,
  useCategoriesTree,
  useAttachCategory,
  useDetachCategory,
} from './useCategories';

// Tags
export { tagKeys, useTags, useAttachTag, useDetachTag } from './useTags';

// CMS Pages
export {
  pageKeys,
  usePages,
  usePage,
  useCreatePage,
  useUpdatePage,
  usePublishPage,
  useUnpublishPage,
  useDeletePage,
} from './usePages';
