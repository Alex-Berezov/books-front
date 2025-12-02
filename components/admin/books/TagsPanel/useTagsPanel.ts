import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useAttachTag, useDetachTag, useTags } from '@/api/hooks';
import type { TagsPanelProps } from './TagsPanel.types';

export const useTagsPanel = (props: TagsPanelProps) => {
  const { versionId, selectedTags, onTagsChange } = props;
  const { enqueueSnackbar } = useSnackbar();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Load tags with search
  const { data: tagsData, isLoading } = useTags(
    {
      page: 1,
      limit: 50,
      search: searchQuery || undefined,
    },
    {
      enabled: searchQuery.length > 0,
    }
  );

  // Mutations for attach/detach
  const attachMutation = useAttachTag({
    onSuccess: () => {
      enqueueSnackbar('Tag attached successfully', { variant: 'success' });
      onTagsChange?.();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to attach tag: ${error.message}`, { variant: 'error' });
    },
  });

  const detachMutation = useDetachTag({
    onSuccess: () => {
      enqueueSnackbar('Tag removed successfully', { variant: 'success' });
      onTagsChange?.();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to remove tag: ${error.message}`, { variant: 'error' });
    },
  });

  const isPending = attachMutation.isPending || detachMutation.isPending;

  /**
   * Check if tag is selected
   */
  const isTagSelected = (tagId: string): boolean => {
    return selectedTags.some((tag) => tag.id === tagId);
  };

  /**
   * Tag selection handler
   */
  const handleTagToggle = (tagId: string) => {
    if (isPending) {
      return;
    }

    if (isTagSelected(tagId)) {
      detachMutation.mutate({ versionId, tagId });
    } else {
      attachMutation.mutate({ versionId, tagId });
    }
  };

  /**
   * Remove tag from selected handler
   */
  const handleRemoveTag = (tagId: string) => {
    if (isPending) {
      return;
    }
    detachMutation.mutate({ versionId, tagId });
  };

  return {
    searchQuery,
    setSearchQuery,
    tagsData,
    isLoading,
    isPending,
    selectedTags,
    isTagSelected,
    handleTagToggle,
    handleRemoveTag,
  };
};
