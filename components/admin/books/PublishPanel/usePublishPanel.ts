import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { usePublishVersion, useUnpublishVersion, usePublicationGate } from '@/api/hooks';
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

/**
 * WP-A.5: «гейт ещё не ответил», «гейт не ответил вовсе» и «гейт запретил» — три разных причины
 * неактивной кнопки. Раньше все три выглядели одинаково, и сетевая ошибка читалась как правовой
 * запрет.
 */
export type PublishGateState = 'not_applicable' | 'loading' | 'error' | 'blocked' | 'allowed';

export const usePublishPanel = (props: PublishPanelProps) => {
  const { versionId, status, onPublishSuccess, onUnpublishSuccess } = props;
  const { enqueueSnackbar } = useSnackbar();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'publish' | 'unpublish'>('publish');
  const [gateError, setGateError] = useState<StructuredPublishError | null>(null);
  // Запрет гейта — ответ на попытку опубликовать, а не постоянное состояние страницы.
  // Пока попытки не было, красный блок не висит и не читается как «редактирование запрещено».
  const [gateDetailsShown, setGateDetailsShown] = useState(false);

  const {
    data: gateData,
    isLoading: isGateLoading,
    isError: isGateError,
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
        setGateDetailsShown(true);
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

  const isPublished = status === 'published';
  const isDraft = status === 'draft';
  const isArchived = status === 'archived';
  const isLoading = publishMutation.isPending || unpublishMutation.isPending;

  const blockingReasons = gateData?.blockingReasons ?? gateError?.blockingReasons ?? [];
  const warnings = gateData?.warnings ?? gateError?.warnings ?? [];

  // WP-H: гейт отвечает на два вопроса. Поля опциональны — бэкенд до выката WP-H их не присылает,
  // и в этом случае про подготовку не говорится ничего: выдумывать разрешение фронт не вправе.
  const canPrepare = gateData?.canPrepare;
  const preparationBlockingCodes = new Set(
    (gateData?.preparationBlockingReasons ?? []).map((reason) => reason.code)
  );

  const gateState: PublishGateState = !isDraft
    ? 'not_applicable'
    : isGateLoading
      ? 'loading'
      : isGateError
        ? 'error'
        : gateData?.canPublish === true
          ? 'allowed'
          : 'blocked';

  // Публикация по-прежнему недоступна во всех трёх случаях, кроме `allowed` — ослабления нет,
  // изменилось только объяснение.
  const canPublish = isPublished ? true : gateState === 'allowed';

  const handleOpenConfirmModal = (action: 'publish' | 'unpublish') => {
    // Публикация по-прежнему не уходит на сервер, пока гейт не разрешил: вместо подтверждения
    // раскрываются причины отказа. Ослабления нет — есть ответ на нажатие.
    if (action === 'publish' && !isPublished && !canPublish) {
      setGateDetailsShown(true);
      return;
    }
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
    gateState,
    gateDetailsShown,
    isGateError,
    blockingReasons,
    warnings,
    canPrepare,
    preparationBlockingCodes,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleConfirmAction,
  };
};
