'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ContentDraftStatus, LlmOperation } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';
import { OperationProgress, type ResumeAction } from './OperationProgress';
import { RunStart, type RunStartProps, type StartEstimate } from './RunStart';

/** Ход, как его видит каркас: общее у хода пересказа и хода анализа. */
interface PanelRun {
  id: string;
  status: ContentDraftStatus;
  failedReason: string | null;
  operation: Pick<LlmOperation, 'id' | 'status' | 'pauseReason'>;
}

export interface WriteRunPanelProps<R extends PanelRun, E extends StartEstimate> {
  versionId: string;
  lang: SupportedLang;
  /** Название хода в подписи области: «Write Summary», «Write Analysis». */
  label: string;
  /** Существительное в сообщениях: «summary», «analysis». */
  noun: string;
  /** Ответ хода: `undefined` — ещё грузится. */
  run: R | null | undefined;
  isError: boolean;
  refetch: () => void;
  actions: RunStartProps<E>['actions'] & {
    discardRun: {
      mutate: (runId: string) => void;
      isPending: boolean;
      variables: string | undefined;
      error: unknown;
    };
    resume: ResumeAction & { variables: { id: string } | undefined };
  };
  /** Оценка и подписи старта; остальное каркас подставляет сам. */
  start: Omit<
    RunStartProps<E>,
    'versionId' | 'lang' | 'building' | 'actions' | 'label' | 'refusalText'
  >;
  progressText: (run: R) => string;
  reasonText: (reason: string | null) => string;
  refusalText: (error: unknown) => string;
  /** Что теряет «Discard run»: текст окна подтверждения. */
  discardMessage: string;
  /** Ход сброшен: вкладка убирает итоги, привязанные к нему. */
  onDiscarded: () => void;
  /** Между отказом сброса и строкой хода (у хода анализа — плашка ядра). */
  beforeProgress?: ReactNode;
  children?: ReactNode;
}

/**
 * Каркас панели хода из досье (F06-3, F07-3a) — один на «Write Summary» и «Write Analysis»:
 * загрузка и отказ чтения, старт, «Discard run» на паузе и после отказа с подтверждением,
 * строка хода, отказ хода. Содержимое хода (тексты, блоки, «Accept all») — в `children`.
 */
export const WriteRunPanel = <R extends PanelRun, E extends StartEstimate>(
  props: WriteRunPanelProps<R, E>
) => {
  const {
    versionId,
    lang,
    label,
    noun,
    run,
    isError,
    refetch,
    actions,
    start,
    progressText,
    reasonText,
    refusalText,
    discardMessage,
    onDiscarded,
    beforeProgress,
    children,
  } = props;
  const [discarding, setDiscarding] = useState(false);
  const building = run?.status === 'building';
  const paused = building && run?.operation.status === 'paused';
  // Отказы «Discard run» и «Continue» — своего хода: у другого хода (новый старт) их нет.
  const discardError =
    run && actions.discardRun.variables === run.id ? actions.discardRun.error : null;
  const resume = {
    ...actions.resume,
    error: run && actions.resume.variables?.id === run.operation.id ? actions.resume.error : null,
  };

  const confirmDiscard = () => {
    setDiscarding(false);
    onDiscarded();
    if (run) actions.discardRun.mutate(run.id);
  };

  return (
    <section className={styles.panel} aria-label={label}>
      {isError ? (
        <p className={styles.error} role="alert">
          Failed to load the {noun} run.{' '}
          <Button variant="link" onClick={() => void refetch()}>
            Retry
          </Button>
        </p>
      ) : run === undefined ? (
        <p className={styles.hint}>Loading the {noun} run…</p>
      ) : (
        <div className={styles.actions}>
          <RunStart
            versionId={versionId}
            lang={lang}
            building={building}
            actions={actions}
            label={label}
            refusalText={refusalText}
            {...start}
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

      {beforeProgress}

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

      {children}

      {/* Строящийся ход отменяет операцию; оплаченное не возвращается — только после подтверждения. */}
      <ConfirmDialog
        isOpen={discarding}
        title="Discard run"
        message={discardMessage}
        confirmLabel="Discard"
        isDestructive
        onConfirm={confirmDiscard}
        onCancel={() => setDiscarding(false)}
      />
    </section>
  );
};
