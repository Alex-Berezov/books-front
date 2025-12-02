import { useSnackbar } from 'notistack';
import { useChapters } from '@/api/hooks';
import type { ReadContentTabProps } from './ReadContentTab.types';

export const useReadContentTab = (props: ReadContentTabProps) => {
  const { versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  // Load chapters
  const { data: chapters, error, isLoading } = useChapters(versionId);

  /**
   * New chapter creation handler
   */
  const handleAddChapter = () => {
    // TODO (M3.2.3): Implement chapter creation
    enqueueSnackbar('Chapter creation not yet implemented', { variant: 'info' });
  };

  /**
   * Chapter edit handler
   */
  const handleEditChapter = (chapterId: string) => {
    // TODO (M3.2.3): Implement chapter editing
    enqueueSnackbar(`Chapter editing not yet implemented (ID: ${chapterId})`, { variant: 'info' });
  };

  /**
   * Chapter delete handler
   */
  const handleDeleteChapter = (chapterId: string) => {
    // TODO (M3.2.3): Implement chapter deletion
    enqueueSnackbar(`Chapter deletion not yet implemented (ID: ${chapterId})`, { variant: 'info' });
  };

  return {
    chapters: chapters || [],
    isLoading,
    error,
    handleAddChapter,
    handleEditChapter,
    handleDeleteChapter,
  };
};
