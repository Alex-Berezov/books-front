import { useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  usePublishVersion,
  useUnpublishVersion,
  usePublicationGate,
  useUpdateVersionRightsGeoBlock,
} from '@/api/hooks';
import type { PublishPanelProps } from './PublishPanel.types';
import type { ApiError } from '@/types/api';
import type { PublicationGateReason } from '@/types/api-schema/rights-intake';

export interface StructuredPublishError {
  message: string;
  code: string;
  canPublish: boolean;
  blockingReasons: PublicationGateReason[];
  warnings: PublicationGateReason[];
}

export const usePublishPanel = (props: PublishPanelProps) => {
  const { versionId, status, onPublishSuccess, onUnpublishSuccess } = props;
  const { enqueueSnackbar } = useSnackbar();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'publish' | 'unpublish'>('publish');
  const [gateError, setGateError] = useState<StructuredPublishError | null>(null);

  const {
    data: gateData,
    isLoading: isGateLoading,
    refetch: refetchGate,
  } = usePublicationGate(status === 'draft' ? versionId : undefined, {
    enabled: status === 'draft',
  });

  const publishMutation = usePublishVersion({
    onSuccess: () => {
      setShowConfirmModal(false);
      setGateError(null);
      onPublishSuccess?.();
    },
    onError: (error) => {
      setShowConfirmModal(false);
      const apiError = error as ApiError;
      const structured = apiError?.data as StructuredPublishError | undefined;
      if (structured?.code === 'RIGHTS_PUBLICATION_BLOCKED') {
        setGateError(structured);
      } else {
        enqueueSnackbar(`Failed to publish version: ${error.message}`, { variant: 'error' });
      }
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

  const geoBlockMutation = useUpdateVersionRightsGeoBlock({
    onSuccess: () => {
      enqueueSnackbar('Geo-block marked as configured', { variant: 'success' });
      refetchGate();
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to update geo-block: ${error.message}`, { variant: 'error' });
    },
  });

  const isPublished = status === 'published';
  const isDraft = status === 'draft';
  const isArchived = status === 'archived';
  const isLoading =
    publishMutation.isPending || unpublishMutation.isPending || geoBlockMutation.isPending;

  const blockingReasons = gateData?.blockingReasons ?? gateError?.blockingReasons ?? [];
  const warnings = gateData?.warnings ?? gateError?.warnings ?? [];
  const canPublish = gateData?.canPublish ?? true;

  const hasGeoBlockIssue = blockingReasons.some(
    (r) => r.code === 'GEO_BLOCK_NOT_CONFIGURED' || r.code === 'BLOCKED_COUNTRIES_REQUIRE_GEO_BLOCK'
  );

  const handleMarkGeoBlockConfigured = () => {
    geoBlockMutation.mutate({ versionId, data: { configured: true } });
  };

  const handleOpenConfirmModal = (action: 'publish' | 'unpublish') => {
    setActionType(action);
    setShowConfirmModal(true);
  };

  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
  };

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
    isLoading: isLoading || isGateLoading,
    canPublish,
    blockingReasons,
    warnings,
    hasGeoBlockIssue,
    handleMarkGeoBlockConfigured,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleConfirmAction,
  };
};
