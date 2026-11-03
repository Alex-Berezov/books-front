'use client';

import { useState, type FC } from 'react';
import { useSummaryWrite, useSummaryWriteActions } from '@/api/hooks';
import { OperationProgress } from '@/components/admin/books/ContentDraft';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SummaryWriteItem } from '@/types/api-schema';
import styles from './SummaryWrite.module.scss';
import {
  acceptAllStopOf,
  acceptedIndexesOf,
  blockingSectionOf,
  fieldChangedOf,
  fieldsOf,
  fullWaitsFor,
  isPending,
  mayHaveWritten,
  progressText,
  reasonText,
  refusalText,
  sortItems,
  type SummaryWriteField,
} from './summaryWrite.utils';
import { SummaryWriteAcceptAll } from './SummaryWriteAcceptAll';
import { SummaryWriteItemCard } from './SummaryWriteItemCard';
import { SummaryWriteStart } from './SummaryWriteStart';
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
  const [acceptAllError, setAcceptAllError] = useState<{ runId: string; error: unknown } | null>(
    null
  );

  const run = data?.draft ?? null;
  const building = run?.status === 'building';
  const paused = building && run?.operation.status === 'paused';
  const ready = run?.status === 'ready';
  const items = run ? sortItems(run.items) : [];
  // «Accept all» берёт предложения и ждущие разделы; перегенерируемые сервер пропускает.
  const acceptable = items.filter((i) => isPending(i) && !i.regenerating);
  const waitsFor = ready ? fullWaitsFor(items) : null;
  const allError = acceptAllError && acceptAllError.runId === run?.id ? acceptAllError.error : null;

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
      setAcceptAllError({ runId: run.id, error });
      // Отказ, после которого точно ничего не записано, форму не трогает. Известно, что принято, —
      // принятые и поле, изменённое на сервере; неизвестно (сеть, 5xx) — все затронутые поля.
      if (!mayHaveWritten(error)) return;
      const done = acceptedIndexesOf(error);
      if (done.length === 0) {
        reload(before);
        return;
      }
      const stop = fieldChangedOf(error) ? acceptAllStopOf(run.items, done) : null;
      reload(before.filter((i) => done.includes(i.index) || i === stop));
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
          <SummaryWriteStart versionId={versionId} lang={lang} run={run} actions={actions} />
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

      {run && ready && acceptable.length > 0 && (
        <SummaryWriteAcceptAll
          run={run}
          pending={actions.acceptAll.isPending}
          disabled={isError}
          error={allError}
          onAcceptAll={() => void acceptAll()}
        />
      )}

      {run && items.length > 0 && (
        <div className={styles.items}>
          {items.map((item) => (
            <SummaryWriteItemCard
              key={`${run.id}:${item.index}`}
              runId={run.id}
              item={item}
              ready={ready}
              disabled={actions.acceptAll.isPending || isError}
              blockedBy={blockingSectionOf(run.items, item)}
              actions={actions}
              onFieldsWritten={onFieldsWritten}
              onAccepted={() => setAcceptAllError(null)}
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
