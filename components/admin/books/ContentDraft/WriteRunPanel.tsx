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
      mutate: (runId: string, options?: { onSuccess?: () => void }) => void;
      /** Снимает отказ сброса: его зовёт новый старт с этой панели. */
      reset: () => void;
      isPending: boolean;
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
  /**
   * Ход `runId` сброшен (ответ получен): вкладка убирает итоги, привязанные к нему, и только к нему —
   * на экране к этому времени может быть другой ход или ни одного.
   */
  onDiscarded: (runId: string) => void;
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
  // Ход, на котором открыто окно подтверждения: опрос мог принести другой, сбрасываем тот, о котором предупредили.
  const [discarding, setDiscarding] = useState<string | null>(null);
  const building = run?.status === 'building';
  const paused = building && run?.operation.status === 'paused';
  // Отказ «Discard run» виден, пока не начат новый сброс или новый старт с этой панели: сбрасывался ход
  // из окна, он мог уйти с экрана (решение арбитра T190; старт из другой вкладки его не снимает).
  // Отказ «Continue» — только своего хода: у другого хода (новый старт) его нет.
  const discardError = actions.discardRun.error;
  // Новый старт снимает отказ сброса прошлого хода (`reset`), открытие и отмена окна старта — нет.
  const startActions = {
    ...actions,
    start: {
      ...actions.start,
      mutate: (vars: { limitUsd?: string }) => {
        // Идущий сброс не отцепляем: `reset` в react-query рвёт колбэк `onSuccess` и отказ этого сброса.
        if (!actions.discardRun.isPending) actions.discardRun.reset();
        actions.start.mutate(vars);
      },
    },
  };
  const resume = {
    ...actions.resume,
    error: run && actions.resume.variables?.id === run.operation.id ? actions.resume.error : null,
  };

  const confirmDiscard = () => {
    const id = discarding;
    setDiscarding(null);
    if (id === null) return;
    // Итоги снимаем после ответа и по id сброшенного хода: отказ их не трогает, итог другого хода тоже.
    actions.discardRun.mutate(id, { onSuccess: () => onDiscarded(id) });
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
            actions={startActions}
            label={label}
            refusalText={refusalText}
            {...start}
          />
          {(paused || run?.status === 'failed') && (
            <Button
              variant="ghost"
              onClick={() => setDiscarding(run.id)}
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
        isOpen={discarding !== null}
        title="Discard run"
        message={discardMessage}
        confirmLabel="Discard"
        isDestructive
        onConfirm={confirmDiscard}
        onCancel={() => setDiscarding(null)}
      />
    </section>
  );
};
