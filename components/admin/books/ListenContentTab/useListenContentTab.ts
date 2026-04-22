import { useSnackbar } from 'notistack';
import type { ListenContentTabProps } from './ListenContentTab.types';
import type { AudioChapter } from '@/types/api-schema';

export const useListenContentTab = (props: ListenContentTabProps) => {
  const { versionId: _versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  // TODO (Phase 4): Replace this stub with `useAudioChapters(versionId)` once the
  // audio chapter hooks from Phase 1 are available.
  const audioChapters: AudioChapter[] = [];
  const isLoading = false as boolean;
  const error = null as Error | null;

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
  return {
    audioChapters,
    isLoading,
    error,
    handleUploadAudio,
    handleAddAudioChapter,
    handleEditAudioChapter,
  };
};
