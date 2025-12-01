import { useSnackbar } from 'notistack';
import { useChapters } from '@/api/hooks';
import type { ListenContentTabProps } from './ListenContentTab.types';

export const useListenContentTab = (props: ListenContentTabProps) => {
  const { versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  // Load chapters (audio)
  const { data: chapters, error, isLoading } = useChapters(versionId);

  /**
   * Audio file upload handler
   */
  const handleUploadAudio = () => {
    // TODO (M3.2.3): Implement audio upload
    enqueueSnackbar('Audio upload not yet implemented', { variant: 'info' });
  };

  /**
   * Audio chapter creation handler
   */
  const handleAddAudioChapter = () => {
    // TODO (M3.2.3): Implement audio chapter creation
    enqueueSnackbar('Audio chapter creation not yet implemented', { variant: 'info' });
  };

  /**
   * Audio chapter edit handler
   */
  const handleEditAudioChapter = (chapterId: string) => {
    // TODO (M3.2.3): Implement audio chapter editing
    enqueueSnackbar(`Audio chapter editing not yet implemented (ID: ${chapterId})`, {
      variant: 'info',
    });
  };

  // Filter only audio chapters
  const audioChapters = chapters?.filter((ch) => ch.audioUrl) || [];

  return {
    audioChapters,
    isLoading,
    error,
    handleUploadAudio,
    handleAddAudioChapter,
    handleEditAudioChapter,
  };
};
