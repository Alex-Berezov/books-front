import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useChapters, useCreateChapter, useDeleteChapter, useUpdateChapter } from '@/api/hooks';
import { toUserMessage } from '@/lib/errors';
import type { ChapterFormData } from './ChapterModal.types';
import type { ReadContentTabProps } from './ReadContentTab.types';
import type { Chapter } from '@/types/api-schema';

export const useReadContentTab = (props: ReadContentTabProps) => {
  const { versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  // State for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | undefined>(undefined);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);

  // API Hooks
  const { data: chapters, error, isLoading } = useChapters(versionId);
  const createChapterMutation = useCreateChapter();
  const updateChapterMutation = useUpdateChapter();
  const deleteChapterMutation = useDeleteChapter();

  /**
   * Open modal for creating new chapter
   */
  const handleAddChapter = () => {
    setEditingChapter(undefined);
    setIsModalOpen(true);
  };

  /**
   * Open modal for editing existing chapter
   */
  const handleEditChapter = (chapterId: string) => {
    const chapter = chapters?.find((c) => c.id === chapterId);
    if (chapter) {
      setEditingChapter(chapter);
      setIsModalOpen(true);
    }
  };

  /**
   * Close editor modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingChapter(undefined);
  };

  /**
   * Save chapter (create or update)
   */
  const handleSaveChapter = async (data: ChapterFormData) => {
    try {
      if (editingChapter) {
        await updateChapterMutation.mutateAsync({
          chapterId: editingChapter.id,
          versionId,
          data: {
            title: data.title,
            content: data.content,
            number: data.number,
          },
        });
        enqueueSnackbar('Chapter updated successfully', { variant: 'success' });
      } else {
        await createChapterMutation.mutateAsync({
          versionId,
          data: {
            title: data.title,
            content: data.content,
            number: data.number,
          },
        });
        enqueueSnackbar('Chapter created successfully', { variant: 'success' });
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save chapter:', error);
      const message = toUserMessage(error);
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  /**
   * Open delete confirmation
   */
  const handleDeleteChapter = (chapterId: string) => {
    setDeletingChapterId(chapterId);
    setIsDeleteModalOpen(true);
  };

  /**
   * Close delete confirmation
   */
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingChapterId(null);
  };

  /**
   * Confirm deletion
   */
  const handleConfirmDelete = async () => {
    if (!deletingChapterId) return;

    try {
      await deleteChapterMutation.mutateAsync({
        chapterId: deletingChapterId,
        versionId,
      });
      enqueueSnackbar('Chapter deleted successfully', { variant: 'success' });
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Failed to delete chapter:', error);
    }
  };

  // Calculate next chapter number
  const nextChapterNumber =
    chapters && chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1;

  return {
    chapters: chapters || [],
    isLoading,
    error,
    // Modal state
    isModalOpen,
    editingChapter,
    isDeleteModalOpen,
    deletingChapterId,
    nextChapterNumber,
    // Handlers
    handleAddChapter,
    handleEditChapter,
    handleDeleteChapter,
    handleCloseModal,
    handleSaveChapter,
    handleCloseDeleteModal,
    handleConfirmDelete,
    // Loading states
    isSubmitting: createChapterMutation.isPending || updateChapterMutation.isPending,
    isDeleting: deleteChapterMutation.isPending,
  };
};
