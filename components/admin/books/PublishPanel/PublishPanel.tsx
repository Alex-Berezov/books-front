'use client';

import type { FC } from 'react';
import { AlertTriangle, Calendar, Loader2, PlugZap, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { PublishPanelProps } from './PublishPanel.types';
import { gateReasonLabel } from './gateReasonLabels';
import { PublishConfirmModal } from './PublishConfirmModal';
import styles from './PublishPanel.module.scss';
import { PublishStatusBadge } from './PublishStatusBadge';
import { usePublishPanel } from './usePublishPanel';

/**
 * WP-A.5: три причины неактивной кнопки получают три разные подписи. Правовой запрет остаётся
 * запретом, но техническая ошибка и незавершённая загрузка больше на него не похожи.
 */
const DISABLED_CAPTIONS: Record<'loading' | 'error', string> = {
  loading: 'Checking the rights gate — the button unlocks as soon as the answer arrives.',
  error: 'The gate check did not complete, so publishing stays disabled until it does.',
};

export const PublishPanel: FC<PublishPanelProps> = (props) => {
  const { status, publishBlockedReason } = props;
  const {
    showConfirmModal,
    actionType,
    isPublished,
    isDraft,
    isArchived,
    isLoading,
    gateState,
    blockingReasons,
    warnings,
    canPrepare,
    gateDetailsShown,
    preparationBlockingCodes,
    handleOpenConfirmModal,
    handleCloseConfirmModal,
    handleConfirmAction,
  } = usePublishPanel(props);

  const hasLegacyBlockingReason = Boolean(publishBlockedReason);
  // Запрет гейта кнопку больше не гасит: нажатие раскрывает причины отказа, а сам запрос
  // на публикацию не уходит (см. `handleOpenConfirmModal`). Неизвестный ответ гейта —
  // «ещё грузится» и «не ответил вовсе» — держит кнопку неактивной, как и раньше.
  const isPublishDisabled =
    isArchived ||
    hasLegacyBlockingReason ||
    (!isPublished && (gateState === 'loading' || gateState === 'error'));
  const disabledCaption =
    isPublished || isArchived || hasLegacyBlockingReason
      ? null
      : gateState === 'loading'
        ? DISABLED_CAPTIONS.loading
        : gateState === 'error'
          ? DISABLED_CAPTIONS.error
          : null;

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.header}>
          <Calendar className={styles.icon} size={20} />
          <h3 className={styles.title}>Publish</h3>
        </div>

        <PublishStatusBadge
          isArchived={isArchived}
          isDraft={isDraft}
          isPublished={isPublished}
          status={status}
        />

        {hasLegacyBlockingReason && !isPublished && (
          <div className={styles.warning} role="alert">
            <p className={styles.warningText}>{publishBlockedReason}</p>
          </div>
        )}

        {gateState === 'loading' && !isPublished && (
          <div className={styles.gatePendingSection}>
            <div className={styles.gatePendingHeader}>
              <Loader2 size={16} />
              <span className={styles.gateTitle}>Checking the rights gate…</span>
            </div>
          </div>
        )}

        {gateDetailsShown && !isPublished && gateState === 'blocked' && (
          <div className={styles.gateBlockedSection} role="alert">
            <div className={styles.gateHeader}>
              <ShieldAlert size={18} />
              <span className={styles.gateTitle}>Publication blocked by rights gate</span>
            </div>
            {blockingReasons.length > 0 ? (
              <ul className={styles.reasonList}>
                {blockingReasons.map((reason) => (
                  <li key={reason.code} className={styles.reasonItem}>
                    <span className={styles.reasonCode}>{gateReasonLabel(reason.code)}</span>
                    <span className={styles.reasonMessage}>{reason.messageRu}</span>
                    {preparationBlockingCodes.has(reason.code) && (
                      <span className={styles.preparationBlockedBadge}>Blocks preparation too</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              /* Гейт запретил, но причин не прислал: нажатие всё равно получает ответ. */
              <p className={styles.gateText}>
                The gate did not allow publication and returned no reason. Reload the page or check
                the rights profile of this version.
              </p>
            )}
            {/* WP-H: подготовка и публикация — разные вопросы. Пока ни один блокер не входит в
                список запрещающих подготовку, редактору есть чем заняться, и молчание об этом
                читалось как «работа остановлена». */}
            {canPrepare === true && (
              <p className={styles.preparationNote}>
                Publication is closed, but preparation is not: keep filling chapters and metadata —
                nothing goes public until the gate opens.
              </p>
            )}
          </div>
        )}

        {gateState === 'error' && blockingReasons.length === 0 && !isPublished && (
          <div className={styles.gateErrorSection} role="alert">
            <div className={styles.gateErrorHeader}>
              <PlugZap size={18} />
              <span className={styles.gateTitle}>Failed to check publication gate</span>
            </div>
            <p className={styles.gateText}>
              This is a technical error, not a legal restriction: the answer of the gate never
              arrived. Reload the page or try again later.
            </p>
          </div>
        )}

        {warnings.length > 0 && !isPublished && (
          <div className={styles.warningSection}>
            <div className={styles.warningHeader}>
              <AlertTriangle size={16} />
              <span className={styles.warningTitle}>Warnings</span>
            </div>
            <ul className={styles.reasonList}>
              {warnings.map((w) => (
                <li key={w.code} className={styles.reasonItem}>
                  <span className={styles.reasonCode}>{gateReasonLabel(w.code)}</span>
                  <span className={styles.reasonMessage}>{w.messageRu}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.actions}>
          {isPublished ? (
            <Button
              variant="warning"
              fullWidth
              loading={isLoading}
              onClick={() => handleOpenConfirmModal('unpublish')}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              variant="success"
              fullWidth
              loading={isLoading}
              disabled={isPublishDisabled}
              onClick={() => handleOpenConfirmModal('publish')}
            >
              Publish
            </Button>
          )}
          {disabledCaption && <p className={styles.disabledCaption}>{disabledCaption}</p>}
        </div>

        <div className={styles.info}>
          <p className={styles.infoText}>
            {isPublished && 'This version is publicly visible to all users.'}
            {isDraft && 'This version is not visible to users. Publish it to make it public.'}
            {isArchived &&
              'This version is archived and cannot be published. Contact an administrator if you need to restore it.'}
          </p>
        </div>
      </div>

      <PublishConfirmModal
        actionType={actionType}
        isLoading={isLoading}
        isOpen={showConfirmModal}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmAction}
      />
    </>
  );
};
