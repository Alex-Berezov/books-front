'use client';

import { useState, type FC, type ReactNode } from 'react';
import Link from 'next/link';
import {
  useContentDraft,
  useContentDraftActions,
  useContentDraftEstimate,
  useDossierEstimate,
} from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ContentDraft, ContentDraftKind } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';
import {
  DISCARD_LOSS,
  DRAFT_BUTTON,
  dossierEstimateText,
  estimateText,
  failedText,
  refusalCode,
  refusalText,
} from './contentDraft.utils';
import { ContentDraftProgress } from './ContentDraftProgress';

export interface ContentDraftBlockProps {
  versionId: string;
  kind: ContentDraftKind;
  lang: SupportedLang;
  /** Почему шаг недоступен (предыдущий не сохранён); `null` — доступен, `''` — недоступен, подсказка уже рядом. */
  blockedHint: string | null;
  /**
   * Готовые части видны и по ходу, и после отказа (разделы Summary: оплачены и годны); иначе
   * результат — только у готовой заготовки.
   */
  partial?: boolean;
  /** Готовая заготовка: карточки разделов, «подставить в поле», «открыть в импорте». */
  children: (draft: ContentDraft, tools: ContentDraftTools) => ReactNode;
}

/** Действия над заготовкой для её карточек. */
export interface ContentDraftTools {
  /** Раздел добавлен «Add section» — отметка на сервере (решение `F05 | F05-10`, Р1). */
  markAdded: (sectionNumber: number) => Promise<unknown>;
}

/**
 * Заготовка из досье (`product.md` §5.1) — шаг Summary (F05-10) или Analysis (F05-11), только
 * `admin`: кнопка с оценкой, ход фоном (строится досье, глоссарий, заготовка; пауза операции),
 * отказ с причиной, готовая заготовка. Ничего не сохраняет — сохраняет редактор (решение арбитра
 * `F05 | F05-11`, Р12: одна оболочка на обе вкладки).
 */
export const ContentDraftBlock: FC<ContentDraftBlockProps> = ({
  versionId,
  kind,
  lang,
  blockedHint,
  partial = false,
  children,
}) => {
  const { data, isError, refetch } = useContentDraft(versionId, kind, true);
  const actions = useContentDraftActions(versionId, kind);
  const [confirming, setConfirming] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const estimate = useContentDraftEstimate(versionId, kind, confirming);
  const dossierEstimate = useDossierEstimate(versionId, rebuilding);

  const draft = data?.draft ?? null;
  const building = draft?.status === 'building';
  // Досье устарело — по отказу старта или оценки; оценка хранит отказ и после закрытия окна.
  // Перестройка пошла — кнопки нет, отказала — снова есть.
  const rebuildDone = actions.rebuildDossier.isPending || actions.rebuildDossier.isSuccess;
  const stale =
    !rebuildDone &&
    [actions.start.error, estimate.error].some((e) => refusalCode(e) === 'DOSSIER_STALE');

  const openStart = () => {
    actions.start.reset();
    actions.rebuildDossier.reset();
    setConfirming(true);
  };
  const confirmDiscard = () => {
    setDiscarding(false);
    if (draft) actions.discard.mutate(draft.id);
  };
  const tools: ContentDraftTools = {
    markAdded: (sectionNumber) =>
      draft
        ? actions.markAdded.mutateAsync({ id: draft.id, sectionNumber })
        : Promise.reject(new Error('no draft')),
  };

  const confirmStart = () => {
    setConfirming(false);
    actions.start.mutate({});
  };
  const confirmRebuild = () => {
    setRebuilding(false);
    actions.rebuildDossier.mutate();
  };

  const startMessage = estimate.data
    ? estimateText(estimate.data)
    : estimate.isError
      ? refusalText(estimate.error)
      : 'Estimating the cost…';
  const dossierMessage = dossierEstimate.data
    ? dossierEstimateText(dossierEstimate.data)
    : dossierEstimate.isError
      ? refusalText(dossierEstimate.error)
      : 'Estimating the cost…';

  return (
    <div className={styles.draft} aria-label={`${DRAFT_BUTTON[kind]} block`}>
      <div className={styles.draftActions}>
        <Button
          variant="secondary"
          onClick={openStart}
          loading={actions.start.isPending}
          disabled={blockedHint !== null || building || actions.start.isPending}
        >
          {DRAFT_BUTTON[kind]}
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
      {blockedHint ? <p className={styles.labelHint}>{blockedHint}</p> : null}

      {isError && (
        <p className={styles.error} role="alert">
          Failed to load the draft.{' '}
          <Button variant="link" onClick={() => void refetch()}>
            Retry
          </Button>
        </p>
      )}
      {actions.start.error && !rebuildDone && (
        <p className={styles.error} role="alert">
          {refusalText(actions.start.error)}
          {refusalCode(actions.start.error) === 'LLM_CEILING_REACHED' && (
            <>
              {' '}
              <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link>
            </>
          )}
        </p>
      )}
      {stale && (
        <Button
          variant="secondary"
          onClick={() => setRebuilding(true)}
          loading={actions.rebuildDossier.isPending}
          disabled={actions.rebuildDossier.isPending}
        >
          Rebuild dossier
        </Button>
      )}
      {actions.rebuildDossier.error && (
        <p className={styles.error} role="alert">
          {refusalText(actions.rebuildDossier.error)}
        </p>
      )}
      {actions.rebuildDossier.isSuccess && (
        <p className={styles.labelHint} role="status">
          The dossier is being rebuilt. Start the draft again when it is ready.
        </p>
      )}

      {draft && building && (
        <ContentDraftProgress draft={draft} lang={lang} resume={actions.resume} />
      )}
      {draft?.status === 'failed' && (
        <p className={styles.error} role="alert">
          {failedText(draft.failedReason)}
        </p>
      )}
      {draft?.status === 'ready' && draft.question && (
        <p className={styles.labelHint}>Question from the model: {draft.question}</p>
      )}
      {draft && (draft.status === 'ready' || (draft.status !== 'discarded' && partial))
        ? children(draft, tools)
        : null}

      {/* «Не нужна» выбрасывает оплаченное: только после подтверждения. */}
      <ConfirmDialog
        isOpen={discarding}
        title="Discard draft"
        message={
          building
            ? 'Stop building this draft and discard it? The money spent so far is not returned.'
            : `Discard this draft? ${DISCARD_LOSS[kind]} a new draft costs money again.`
        }
        confirmLabel="Discard"
        isDestructive
        onConfirm={confirmDiscard}
        onCancel={() => setDiscarding(false)}
      />
      {/* Без цены подтверждать нечего: подтверждение неактивно, пока оценка не пришла. Досье,
          которому старт откажет (T151), не построится: старт выбросил бы прежнюю заготовку и встал. */}
      <ConfirmDialog
        isOpen={confirming}
        title={DRAFT_BUTTON[kind]}
        message={startMessage}
        confirmLabel="Start"
        isLoading={estimate.isFetching}
        isConfirmDisabled={!estimate.data || estimate.data.dossier?.refusedTooLong === true}
        onConfirm={confirmStart}
        onCancel={() => setConfirming(false)}
      />
      <ConfirmDialog
        isOpen={rebuilding}
        title="Rebuild dossier"
        message={dossierMessage}
        confirmLabel="Rebuild"
        isLoading={dossierEstimate.isFetching}
        // Старт откажет `DOSSIER_TOO_LONG` (T147): «Rebuild» закрыл бы строку отказом, а не строил.
        isConfirmDisabled={!dossierEstimate.data || dossierEstimate.data.refusedTooLong}
        onConfirm={confirmRebuild}
        onCancel={() => setRebuilding(false)}
      />
    </div>
  );
};
