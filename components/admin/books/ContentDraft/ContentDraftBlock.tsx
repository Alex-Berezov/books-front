'use client';

import { useState, type FC, type ReactNode } from 'react';
import { useContentDraft, useContentDraftActions, useContentDraftEstimate } from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ContentDraft } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';
import {
  DISCARD_LOSS,
  DRAFT_BUTTON,
  buildingText,
  estimateText,
  failedText,
  refusalText,
} from './contentDraft.utils';
import { OperationProgress } from './OperationProgress';
import { StartConfirm } from './StartConfirm';
import { StartRefusal } from './StartRefusal';

export interface ContentDraftBlockProps {
  versionId: string;
  lang: SupportedLang;
  /** Готовая заготовка: «открыть в импорте». */
  children: (draft: ContentDraft) => ReactNode;
}

const KIND = 'analysis';

/**
 * Заготовка Analysis из досье (F05 `product.md` §5.1, F05-11), только `admin`: кнопка с оценкой,
 * ход фоном (строится досье, глоссарий, заготовка; пауза операции), отказ с причиной, готовая
 * заготовка. Ничего не сохраняет — сохраняет редактор. Пошаговые заготовки Summary (F05-10)
 * сняты: их заменил ход «Write Summary» (F06-3), он же делит с этим блоком паузу, отказ старта
 * и окно оценки.
 */
export const ContentDraftBlock: FC<ContentDraftBlockProps> = ({ versionId, lang, children }) => {
  const { data, isError, refetch } = useContentDraft(versionId, KIND, true);
  const actions = useContentDraftActions(versionId, KIND);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const estimate = useContentDraftEstimate(versionId, KIND, confirming);

  const draft = data?.draft ?? null;
  const building = draft?.status === 'building';

  const openStart = () => {
    actions.start.reset();
    actions.rebuildDossier.reset();
    setConfirming(true);
  };
  const confirmDiscard = () => {
    setDiscarding(false);
    if (draft) actions.discard.mutate(draft.id);
  };

  return (
    <div className={styles.draft} aria-label={`${DRAFT_BUTTON} block`}>
      <div className={styles.draftActions}>
        <Button
          variant="secondary"
          onClick={openStart}
          loading={actions.start.isPending}
          disabled={building || actions.start.isPending}
        >
          {DRAFT_BUTTON}
        </Button>
        {draft && (
          <Button
            variant="ghost"
            onClick={() => setDiscarding(true)}
            loading={actions.discard.isPending}
            disabled={actions.discard.isPending}
          >
            Discard draft
          </Button>
        )}
      </div>

      {isError && (
        <p className={styles.error} role="alert">
          Failed to load the draft.{' '}
          <Button variant="link" onClick={() => void refetch()}>
            Retry
          </Button>
        </p>
      )}
      <StartRefusal
        versionId={versionId}
        lang={lang}
        startError={actions.start.error}
        estimateError={estimate.error}
        rebuildDossier={actions.rebuildDossier}
        refusalText={refusalText}
        rebuiltHint="The dossier is being rebuilt. Start the draft again when it is ready."
      />

      {draft && building && (
        <OperationProgress
          operation={draft.operation}
          text={buildingText(draft)}
          lang={lang}
          resume={actions.resume}
          limitLabel="New limit of the draft"
          resumeLabel="Resume"
          refusalText={refusalText}
        />
      )}
      {draft?.status === 'failed' && (
        <p className={styles.error} role="alert">
          {failedText(draft.failedReason)}
        </p>
      )}
      {draft?.status === 'ready' ? children(draft) : null}

      {/* «Не нужна» выбрасывает оплаченное: только после подтверждения. */}
      <ConfirmDialog
        isOpen={discarding}
        title="Discard draft"
        message={
          building
            ? 'Stop building this draft and discard it? The money spent so far is not returned.'
            : `Discard this draft? ${DISCARD_LOSS} a new draft costs money again.`
        }
        confirmLabel="Discard"
        isDestructive
        onConfirm={confirmDiscard}
        onCancel={() => setDiscarding(false)}
      />
      <StartConfirm
        isOpen={confirming}
        title={DRAFT_BUTTON}
        estimate={estimate}
        text={estimateText}
        refusalText={refusalText}
        onConfirm={() => {
          setConfirming(false);
          actions.start.mutate({});
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
};
