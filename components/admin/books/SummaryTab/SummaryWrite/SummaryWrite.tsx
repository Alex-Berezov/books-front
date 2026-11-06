'use client';

import { useState, type FC } from 'react';
import { useSummaryWrite, useSummaryWriteActions, useSummaryWriteEstimate } from '@/api/hooks';
import { OperationProgress, RunStart } from '@/components/admin/books/ContentDraft';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SummaryWriteItem } from '@/types/api-schema';
import styles from './SummaryWrite.module.scss';
import {
  blockingSectionOf,
  fieldsOf,
  fullWaitsFor,
  isPending,
  itemsToReloadAfterAcceptAll,
  progressText,
  reasonText,
  refusalText,
  sortItems,
  startLossText,
  writeEstimateText,
  type SummaryWriteField,
} from './summaryWrite.utils';
import { SummaryWriteAcceptAll } from './SummaryWriteAcceptAll';
import { SummaryWriteItemCard } from './SummaryWriteItemCard';
import { useWrittenFields } from './useWrittenFields';

export interface SummaryWriteProps {
  versionId: string;
  lang: SupportedLang;
  /** Ход записал полный или «Очень кратко»: форма вкладки берёт эти поля с сервера. */
  onFieldsWritten: (fields: SummaryWriteField[]) => void;
}

/**
 * Ход пересказа «Write Summary» (F06 `product.md` §5, только `admin`): старт с оценкой и лимитом,
 * ход фоном («Writing: sections N of M», пауза с причиной и «Continue», отказ с причиной),
 * «Discard run» на паузе и после отказа, тексты хода с отметками проверки, «Accept all».
 */
export const SummaryWrite: FC<SummaryWriteProps> = ({ versionId, lang, onFieldsWritten }) => {
  const { data, isError, refetch } = useSummaryWrite(versionId, true);
  const actions = useSummaryWriteActions(versionId);
  const [discarding, setDiscarding] = useState(false);
  // Отказ «Accept all» — со своим ходом: у нового хода или после «Accept» и «Discard run» его нет.
  // Тексты хода на момент нажатия: перечитанный после отказа ход уже не держит текст, на котором встали.
  const [acceptAllError, setAcceptAllError] = useState<{
    runId: string;
    error: unknown;
    items: SummaryWriteItem[];
  } | null>(null);

  const run = data?.draft ?? null;
  const building = run?.status === 'building';
  const paused = building && run?.operation.status === 'paused';
  const ready = run?.status === 'ready';
  const items = run ? sortItems(run.items) : [];
  // «Accept all» берёт предложения и ждущие разделы; перегенерируемые сервер пропускает.
  const acceptable = items.filter((i) => isPending(i) && !i.regenerating);
  const waitsFor = ready ? fullWaitsFor(items) : null;
  const allFailure = acceptAllError && acceptAllError.runId === run?.id ? acceptAllError : null;

  useWrittenFields(versionId, data?.draft, actions.refreshFields, onFieldsWritten);
  // Отказы «Discard run» и «Continue» — своего хода: у другого хода (новый старт) их нет.
  const discardError =
    run && actions.discardRun.variables === run.id ? actions.discardRun.error : null;
  const resume = {
    ...actions.resume,
    error: run && actions.resume.variables?.id === run.operation.id ? actions.resume.error : null,
  };

  const confirmDiscard = () => {
    setDiscarding(false);
    setAcceptAllError(null);
    if (run) actions.discardRun.mutate(run.id);
  };
  const acceptAll = async () => {
    if (!run) return;
    const before = acceptable;
    const reload = (items: SummaryWriteItem[]) => {
      const fields = fieldsOf(items);
      if (fields.length > 0) onFieldsWritten(fields);
    };
    setAcceptAllError(null);
    try {
      await actions.acceptAll.mutateAsync(run.id);
      reload(before);
    } catch (error) {
      setAcceptAllError({ runId: run.id, error, items: run.items });
      reload(itemsToReloadAfterAcceptAll(error, before, run.items));
    }
  };

  return (
    <section className={styles.block} aria-label="Write Summary">
      {isError ? (
        <p className={styles.error} role="alert">
          Failed to load the summary run.{' '}
          <Button variant="link" onClick={() => void refetch()}>
            Retry
          </Button>
        </p>
      ) : data === undefined ? (
        <p className={styles.hint}>Loading the summary run…</p>
      ) : (
        <div className={styles.actions}>
          <RunStart
            versionId={versionId}
            lang={lang}
            building={building}
            actions={actions}
            label="Write Summary"
            buildingHint="The summary of this version is being written: Write Summary is available when it ends."
            rebuiltHint="The dossier is being rebuilt. Press Write Summary again when it is ready."
            useEstimate={useSummaryWriteEstimate}
            estimateText={writeEstimateText}
            loss={startLossText(run)}
            refusalText={refusalText}
          />
          {(paused || run?.status === 'failed') && (
            <Button
              variant="ghost"
              onClick={() => setDiscarding(true)}
              loading={actions.discardRun.isPending}
              disabled={actions.discardRun.isPending}
            >
              Discard run
            </Button>
          )}
        </div>
      )}
      {discardError ? (
        <p className={styles.error} role="alert">
          {refusalText(discardError)}
        </p>
      ) : null}

      {run && building && (
        <OperationProgress
          operation={run.operation}
          text={progressText(run)}
          lang={lang}
          resume={resume}
          limitLabel="New limit of the run"
          resumeLabel="Continue"
          refusalText={refusalText}
        />
      )}
      {run?.status === 'failed' && (
        <p className={styles.error} role="alert">
          Failed: {reasonText(run.failedReason)}.
        </p>
      )}

      {waitsFor !== null && (
        <p className={styles.hint}>
          Full and very short summaries wait for section {waitsFor}: regenerate it. A section
          written by hand does not finish this run: that takes a new paid Write Summary, which
          discards the proposals not accepted here.
        </p>
      )}

      {/* Отказ «Accept all» остаётся на экране и тогда, когда после него принимать уже нечего. */}
      {run && ready && (acceptable.length > 0 || allFailure !== null) && (
        <SummaryWriteAcceptAll
          run={run}
          pending={actions.acceptAll.isPending}
          disabled={isError || acceptable.length === 0}
          error={allFailure?.error ?? null}
          itemsAtFailure={allFailure?.items ?? run.items}
          onAcceptAll={() => void acceptAll()}
        />
      )}

      {run && items.length > 0 && (
        <div className={styles.items}>
          {items.map((item) => (
            <SummaryWriteItemCard
              key={`${run.id}:${item.index}`}
              runId={run.id}
              lang={lang}
              item={item}
              ready={ready}
              disabled={actions.acceptAll.isPending || isError}
              blockedBy={blockingSectionOf(run.items, item)}
              actions={actions}
              onFieldsWritten={onFieldsWritten}
              onDecided={() => setAcceptAllError(null)}
            />
          ))}
        </div>
      )}

      {/* Строящийся ход отменяет операцию; оплаченное не возвращается — только после подтверждения. */}
      <ConfirmDialog
        isOpen={discarding}
        title="Discard run"
        message="Discard this summary run? Its operation and regenerations stop, texts not in the fields are lost, the money spent is not returned. The fields are not touched."
        confirmLabel="Discard"
        isDestructive
        onConfirm={confirmDiscard}
        onCancel={() => setDiscarding(false)}
      />
    </section>
  );
};
