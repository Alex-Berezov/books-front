'use client';

import type { FC } from 'react';
import { Alert, Button } from 'antd';
import {
  translationRunRefetchInterval,
  useTranslationRun,
  useTranslationRunReport,
} from '@/api/hooks';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { Spinner } from '@/components/admin/shared';
import { costRows, runOutcome } from '../runOverview.utils';
import { refusalText } from '../translationRun.utils';
import styles from './RunOverview.module.scss';

export interface RunOverviewProps {
  runId: string;
  bookId: string;
}

const formatStarted = (iso: string): string => new Date(iso).toLocaleString();

/**
 * Сводка одного запуска вверху экрана перевода: закончено ли всё, итог в деньгах и разбивка по
 * языкам и разделам. Подробности хода — в деталях экрана.
 */
export const RunOverview: FC<RunOverviewProps> = ({ runId, bookId }) => {
  const run = useTranslationRun(runId, bookId);
  const live = run.data !== undefined && translationRunRefetchInterval(run.data) !== false;
  const report = useTranslationRunReport(runId, live);

  // Не прочитан сам запуск — исхода нет: плашка вместо карточки. Отказ отчёта (только деньги) —
  // плашка на месте итога и разбивки, исход и проблемы остаются по ходу запуска.
  if (run.isError) {
    return (
      <Alert
        className={styles.alert}
        type="error"
        message={refusalText(run.error)}
        action={
          <Button size="small" onClick={() => void run.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  if (!run.data) return <Spinner />;

  const outcome = runOutcome(run.data);
  const rows = report.data ? costRows(report.data) : [];

  return (
    <section className={styles.card} data-outcome={outcome.kind} aria-label="Translation run">
      <div className={styles.head}>
        <div>
          <p className={styles.status} data-testid="run-outcome">
            {outcome.title}
          </p>
          <p className={styles.meta}>
            Started {formatStarted(run.data.createdAt)} · languages{' '}
            {run.data.languages.map((l) => l.language.toUpperCase()).join(', ')}
            {outcome.kind === 'running' &&
              ` · ${outcome.languagesTranslated} of ${outcome.languagesTotal} translated`}
          </p>
        </div>
        <div className={styles.total}>
          <span className={styles.totalLabel}>Total cost</span>
          <span className={styles.totalValue} data-testid="run-total">
            {/* Отчёт ещё читается — «…», а не прочерк отказа. */}
            {report.isLoading ? '…' : formatMoney(report.data?.totalUsd ?? null)}
          </span>
          {report.data && report.data.inFlight.calls > 0 && (
            <span className={styles.meta}>
              + {formatMoney(report.data.inFlight.reservedUsd)} in progress
            </span>
          )}
        </div>
      </div>

      {outcome.hasPause && (
        <p className={styles.meta}>Resume or cancel it under “Details” below.</p>
      )}
      {outcome.problems.length > 0 && (
        <ul className={styles.problems}>
          {outcome.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {outcome.modelFlags > 0 && outcome.kind !== 'running' && (
        <p className={styles.meta}>
          Model flags to review: {outcome.modelFlags} (see the details below and the Summary,
          Analysis and World tabs)
        </p>
      )}

      {report.isError && (
        <Alert
          className={styles.costAlert}
          type="error"
          message={`Cost: ${refusalText(report.error)}`}
          action={
            <Button size="small" onClick={() => void report.refetch()}>
              Retry
            </Button>
          }
        />
      )}
      {rows.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Cost</th>
              <th scope="col">Translation</th>
              {run.data.writeSummary && <th scope="col">Summary</th>}
              {run.data.writeAnalysis && <th scope="col">Analysis</th>}
              {run.data.writeWorld && <th scope="col">World</th>}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{formatMoney(r.translationUsd)}</td>
                {run.data.writeSummary && <td>{formatMoney(r.summaryUsd)}</td>}
                {run.data.writeAnalysis && <td>{formatMoney(r.analysisUsd)}</td>}
                {run.data.writeWorld && <td>{formatMoney(r.worldUsd)}</td>}
                <td>{formatMoney(r.totalUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
