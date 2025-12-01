import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { usePublishVersion, useUnpublishVersion } from '@/api/hooks';
import type { PublishPanelProps } from './PublishPanel.types';

export const usePublishPanel = (props: PublishPanelProps) => {
  const { versionId, status, onPublishSuccess, onUnpublishSuccess } = props;
  const { enqueueSnackbar } = useSnackbar();

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'publish' | 'unpublish'>('publish');

  // Mutations for publish/unpublish
  const publishMutation = usePublishVersion({
    onSuccess: () => {
      setShowConfirmModal(false);
      onPublishSuccess?.();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to publish version: ${error.message}`, { variant: 'error' });
    },
  });

  const unpublishMutation = useUnpublishVersion({
    onSuccess: () => {
      setShowConfirmModal(false);
      onUnpublishSuccess?.();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to unpublish version: ${error.message}`, { variant: 'error' });
    },
  });

  const isPublished = status === 'published';
  const isDraft = status === 'draft';
  const isArchived = status === 'archived';
  const isLoading = publishMutation.isPending || unpublishMutation.isPending;

  /**
   * Open confirmation modal
   */
  const handleOpenConfirmModal = (action: 'publish' | 'unpublish') => {
    setActionType(action);
    setShowConfirmModal(true);
  };

  /**
   * Close confirmation modal
   */
  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
  };

  /**
   * Confirm action
   */
  const handleConfirmAction = () => {
    if (actionType === 'publish') {
      publishMutation.mutate(versionId);
    } else {
      unpublishMutation.mutate(versionId);
    }
  };

  return {
    showConfirmModal,
    actionType,
    isPublished,
    isDraft,
    isArchived,
    isLoading,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleConfirmAction,
  };
};
