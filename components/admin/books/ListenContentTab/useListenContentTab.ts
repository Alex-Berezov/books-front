import { useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  useAudioChapters,
  useCreateAudioChapter,
  useDeleteAudioChapter,
  useUpdateAudioChapter,
} from '@/api/hooks';
import { toUserMessage } from '@/lib/errors';
import type { AudioChapterFormData } from './AudioChapterModal.types';
import type { ListenContentTabProps } from './ListenContentTab.types';
import type { AudioChapter } from '@/types/api-schema';

export const useListenContentTab = (props: ListenContentTabProps) => {
  const { versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<AudioChapter | undefined>(undefined);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);

  // API hooks — useAudioChapters returns `{ items, total, page, limit }`
  const { data, error, isLoading } = useAudioChapters(versionId);
  const audioChapters = data?.items ?? [];

  const createMutation = useCreateAudioChapter();
  const updateMutation = useUpdateAudioChapter();
  const deleteMutation = useDeleteAudioChapter();

  const handleAddAudioChapter = () => {
    setEditingChapter(undefined);
    setIsModalOpen(true);
  };

  const handleEditAudioChapter = (chapterId: string) => {
    const chapter = audioChapters.find((c) => c.id === chapterId);
    if (chapter) {
      setEditingChapter(chapter);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingChapter(undefined);
  };

  const handleSaveAudioChapter = async (formData: AudioChapterFormData) => {
    try {
      if (editingChapter) {
        await updateMutation.mutateAsync({
          audioChapterId: editingChapter.id,
          bookVersionId: versionId,
          data: {
            number: formData.number,
            title: formData.title,
            audioUrl: formData.audioUrl,
            mediaId: formData.mediaId ?? null,
            duration: formData.duration,
            description: formData.description ?? null,
            transcript: formData.transcript ?? null,
          },
        });
        enqueueSnackbar('Audio chapter updated', { variant: 'success' });
      } else {
        await createMutation.mutateAsync({
          bookVersionId: versionId,
          data: {
            number: formData.number,
            title: formData.title,
            audioUrl: formData.audioUrl,
            mediaId: formData.mediaId ?? null,
            duration: formData.duration,
            description: formData.description ?? null,
            transcript: formData.transcript ?? null,
          },
        });
        enqueueSnackbar('Audio chapter created', { variant: 'success' });
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save audio chapter:', err);
      enqueueSnackbar(toUserMessage(err), { variant: 'error' });
    }
  };

  const handleDeleteAudioChapter = (chapterId: string) => {
    setDeletingChapterId(chapterId);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingChapterId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingChapterId) return;
    try {
      await deleteMutation.mutateAsync({
        audioChapterId: deletingChapterId,
        bookVersionId: versionId,
      });
      enqueueSnackbar('Audio chapter deleted', { variant: 'success' });
      handleCloseDeleteModal();
    } catch (err) {
      console.error('Failed to delete audio chapter:', err);
      enqueueSnackbar(toUserMessage(err), { variant: 'error' });
    }
  };

  // Empty-state upload entry point simply opens the create modal — the
  // AudioPicker inside handles the actual file upload.
  const handleUploadAudio = () => {
    handleAddAudioChapter();
  };

  const nextChapterNumber =
    audioChapters.length > 0 ? Math.max(...audioChapters.map((c) => c.number)) + 1 : 1;

  const totalDurationSeconds = audioChapters.reduce((sum, c) => sum + (c.duration ?? 0), 0);

  return {
    audioChapters,
    isLoading,
    error: (error as Error | null) ?? null,
    // Modal state
    isModalOpen,
    editingChapter,
    isDeleteModalOpen,
    nextChapterNumber,
    totalDurationSeconds,
    // Handlers
    handleAddAudioChapter,
    handleEditAudioChapter,
    handleDeleteAudioChapter,
    handleCloseModal,
    handleSaveAudioChapter,
    handleCloseDeleteModal,
    handleConfirmDelete,
    handleUploadAudio,
    // Loading states
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
