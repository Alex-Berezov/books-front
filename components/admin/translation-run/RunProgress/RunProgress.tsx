'use client';

import { useEffect, useRef, type FC } from 'react';
import { Alert, Button, Popconfirm } from 'antd';
import Link from 'next/link';
import { useTranslationRunActions } from '@/api/hooks';
import { LimitResume } from '@/components/admin/common/LimitResume';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { LlmOperation, TranslationRun } from '@/types/api-schema';
import {
  chapterText,
  DRAFT_LINK_TEXT,
  failedText,
  operationStatusText,
  pauseActionOf,
  refusalText,
  runStatusText,
  stageText,
} from '../translationRun.utils';
import { PausePanel } from './PausePanel';
import styles from './RunProgress.module.scss';

export interface RunProgressProps {
  run: TranslationRun;
  bookId: string;
  lang: SupportedLang;
  onReport: () => void;
  /** `DOSSIER_STALE`: запуск отменён, открыть окно запуска с новой оценкой. */
  onRestart: () => void;
}

const OPERATION_KIND: Record<LlmOperation['kind'], string> = {
  dossier: 'Dossier / glossary',
  translation_run: 'Run',
  compare: 'Compare',
  draft: 'Draft',
  translation_retry: 'Piece retry',
};

/**
 * Блок запуска на странице версии (F05-7, `product.md` §2.3): этап и «глава N из M» по языкам,
 * потрачено/лимит, флаги; пауза, «продолжить», отмена с подтверждением и действие на каждую
 * причину паузы; операции досье и глоссариев своими строками со своими кнопками (В5).
 */
export const RunProgress: FC<RunProgressProps> = ({ run, bookId, lang, onReport, onRestart }) => {
  const actions = useTranslationRunActions(run, bookId);
  const op = run.operation;
  const live = op.status === 'active' || op.status === 'paused';
  const pause = pauseActionOf(run);
  // Отказ кнопки досье - про досье, а не про запуск: своя приставка.
  const runErrors = [actions.pause.error, actions.resume.error, actions.cancel.error];
  const operationErrors = [actions.resumeOperation.error, actions.cancelOperation.error];
  const errors = [
    ...runErrors.filter((e) => e !== null).map((e) => refusalText(e)),
    ...operationErrors
      .filter((e) => e !== null)
      .map((e) => `Dossier or glossary: ${refusalText(e)}`),
  ];
  // Смена состояния любой операции блока - то, что отказ мог описывать, уже другое.
  const stateKey = [op, ...run.operations]
    .map((o) => `${o.id}:${o.status}:${o.pauseReason ?? ''}`)
    .join('|');
  const resumingId = actions.resumeOperation.isPending
    ? actions.resumeOperation.variables?.id
    : undefined;

  // Отказ относился к прежнему состоянию: блок перечитался и показывает новое — плашка снимается.
  // Идущий запрос не сбрасывается: опрос меняет состояние и во время него, а сброс отцепил бы
  // кнопку от ответа - пропали бы и отказ, и `onSuccess` (перезапуск после отмены).
  const mutations = useRef([
    actions.pause,
    actions.resume,
    actions.cancel,
    actions.resumeOperation,
    actions.cancelOperation,
  ]);
  mutations.current = [
    actions.pause,
    actions.resume,
    actions.cancel,
    actions.resumeOperation,
    actions.cancelOperation,
  ];
  useEffect(() => {
    for (const m of mutations.current) if (!m.isPending) m.reset();
  }, [stateKey]);

  return (
    <section className={styles.block} aria-label="Translation run">
      <div className={styles.header}>
        <h2 className={styles.title}>Translation run: {runStatusText(op)}</h2>
        <span>
          Spent {formatMoney(op.spentUsd)} of {formatMoney(op.limitUsd)}
        </span>
        <div className={styles.buttons}>
          {op.status === 'active' && (
            <Button loading={actions.pause.isPending} onClick={() => actions.pause.mutate()}>
              Pause
            </Button>
          )}
          {live && (
            <Popconfirm
              title="Cancel the translation run?"
              description="Languages not finished are cancelled; spent money is not returned."
              okText="Cancel the run"
              cancelText="Keep"
              onConfirm={() => actions.cancel.mutate()}
            >
              <Button danger loading={actions.cancel.isPending}>
                Cancel
              </Button>
            </Popconfirm>
          )}
          <Button onClick={onReport}>Report</Button>
        </div>
      </div>

      {pause && (
        <PausePanel
          // Своё состояние у каждой паузы: введённый лимит или модель не переезжают на следующую.
          key={`${op.pauseReason ?? 'manual'}:${op.updatedAt}`}
          pause={pause}
          lang={lang}
          pending={actions.resume.isPending || actions.resumeOperation.isPending}
          onResume={(data) => actions.resume.mutate(data)}
          onResumeOperation={(id) => actions.resumeOperation.mutate({ id })}
          onRestart={() => actions.cancel.mutate(undefined, { onSuccess: onRestart })}
        />
      )}
      {errors.map((e, i) => (
        <Alert key={i} className={styles.alert} type="error" message={e} />
      ))}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Language</th>
            <th>Stage</th>
            <th>Progress</th>
            <th>Flagged pieces / chapters</th>
            <th>Draft</th>
            <th>Pieces</th>
          </tr>
        </thead>
        <tbody>
          {run.languages.map((l) => (
            <tr key={l.language}>
              <td>{l.language.toUpperCase()}</td>
              <td>{l.status === 'failed' ? failedText(l) : stageText(l)}</td>
              <td>
                {chapterText(l)}
                {l.chunksTotal > 0 && `, pieces ${l.chunksDone}/${l.chunksTotal}`}
              </td>
              <td>
                {l.flaggedChunks} / {l.flaggedChapters}
              </td>
              <td>
                {l.draftVersionId ? (
                  <Link href={`/admin/${lang}/books/versions/${l.draftVersionId}`}>
                    {DRAFT_LINK_TEXT}
                  </Link>
                ) : (
                  '—'
                )}
              </td>
              <td>
                {l.chunksTotal > 0 ? (
                  <Link
                    href={`/admin/${lang}/books/versions/${run.bookVersionId}/translation-chunks?${new URLSearchParams({ run: run.id, book: bookId, language: l.language }).toString()}`}
                  >
                    Original | translation
                  </Link>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {run.operations.length > 0 && (
        <ul className={styles.operations} aria-label="Dossier and glossary operations">
          {run.operations.map((o) => (
            <li key={o.id}>
              {OPERATION_KIND[o.kind]}: {operationStatusText(o)} · spent {formatMoney(o.spentUsd)}{' '}
              of {formatMoney(o.limitUsd)}{' '}
              {o.status === 'paused' &&
                (o.pauseReason === 'CEILING_REACHED' ||
                  o.pauseReason === 'NO_COMPLIANT_PROVIDER') && (
                  <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link>
                )}{' '}
              {o.status === 'paused' && o.pauseReason === 'LIMIT_REACHED' && (
                <LimitResume
                  label={`New limit of operation ${o.id}`}
                  pending={resumingId === o.id}
                  onResume={(limitUsd) => actions.resumeOperation.mutate({ id: o.id, limitUsd })}
                >
                  <span>New limit, $:</span>
                </LimitResume>
              )}
              {o.status === 'paused' && o.pauseReason !== 'LIMIT_REACHED' && (
                <Button
                  size="small"
                  loading={resumingId === o.id}
                  onClick={() => actions.resumeOperation.mutate({ id: o.id })}
                >
                  Resume
                </Button>
              )}{' '}
              {(o.status === 'active' || o.status === 'paused') && (
                <Popconfirm
                  title="Cancel this dossier or glossary build?"
                  description="Every run and compare waiting for it stops waiting too."
                  okText="Cancel the build"
                  cancelText="Keep"
                  onConfirm={() => actions.cancelOperation.mutate(o.id)}
                >
                  <Button size="small" danger>
                    Cancel
                  </Button>
                </Popconfirm>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
