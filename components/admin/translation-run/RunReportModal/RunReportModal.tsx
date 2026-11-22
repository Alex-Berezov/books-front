'use client';

import type { FC } from 'react';
import { Alert, Spin } from 'antd';
import { useTranslationRunReport } from '@/api/hooks';
import { Modal } from '@/components/admin/common/Modal';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { llmStageRunName } from '@/lib/admin/llm-stages';
import type { SupportedLang } from '@/lib/i18n/lang';
import { sumAnalysisSpent } from '../analysisLine.utils';
import { sumSummarySpent } from '../summaryLine.utils';
import { refusalText } from '../translationRun.utils';
import { sumWorldSpent } from '../worldLine.utils';
import { LanguageReport } from './LanguageReport';
import styles from './RunReportModal.module.scss';

export interface RunReportModalProps {
  runId: string;
  lang: SupportedLang;
  /** Запуск идёт: отчёт перечитывается, пока окно открыто. */
  live?: boolean;
  /** Write Summary у запуска (строка списка): строка раздела и у языка без раздела (Р8). */
  writeSummary?: boolean;
  /** Write Analysis у запуска (строка списка): строка анализа и у языка без анализа. */
  writeAnalysis?: boolean;
  /** Write World у запуска (строка списка): строка мира и у языка без мира (F08-9b). */
  writeWorld?: boolean;
  onClose: () => void;
}

/**
 * Отчёт запуска (F05-7, `product.md` §2.4): куски и повторы, флаги с причинами, главы
 * не в черновике, итоговая проверка, ссылка на черновик версии, стоимость по этапам и моделям.
 */
export const RunReportModal: FC<RunReportModalProps> = ({
  runId,
  lang,
  live,
  writeSummary = false,
  writeAnalysis = false,
  writeWorld = false,
  onClose,
}) => {
  const report = useTranslationRunReport(runId, live);
  // Траты Summary в `costs` не входят (`totalUsd` покрывает оба): своей строкой.
  // Строка — по наличию раздела: сумма не по форме денег даёт прочерк, а не пропавшую строку.
  const hasSummary = report.data?.languages.some((l) => l.summary !== null) ?? false;
  const summarySpent = report.data ? sumSummarySpent(report.data.languages) : null;
  // Траты Analysis — так же своей строкой (F07-3b).
  // `!= null`: ответ прежнего бэкенда поля `analysis` не несёт вовсе (окно выката, F07-3b).
  const hasAnalysis = report.data?.languages.some((l) => l.analysis != null) ?? false;
  const analysisSpent = report.data ? sumAnalysisSpent(report.data.languages) : null;
  // Траты World — так же своей строкой (F08-9b); `!= null` — по той же причине.
  const hasWorld = report.data?.languages.some((l) => l.world != null) ?? false;
  const worldSpent = report.data ? sumWorldSpent(report.data.languages) : null;

  return (
    <Modal isOpen title="Translation report" size="xl" showFooter={false} onCancel={onClose}>
      {report.isLoading && <Spin />}
      {report.isError && <Alert type="error" message={refusalText(report.error)} />}
      {report.data && (
        <>
          {report.data.languages.map((l) => (
            <LanguageReport
              key={l.language}
              report={l}
              lang={lang}
              writeSummary={writeSummary}
              writeAnalysis={writeAnalysis}
              writeWorld={writeWorld}
            />
          ))}
          <h3 className={styles.subtitle}>Cost</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Model</th>
                <th>Calls</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {report.data.costs.map((c) => (
                <tr key={`${c.stage}:${c.model ?? ''}`}>
                  <td>{llmStageRunName(c.stage)}</td>
                  <td>{c.model ?? '—'}</td>
                  <td>{c.calls}</td>
                  <td>{formatMoney(c.costUsd)}</td>
                </tr>
              ))}
              {hasSummary && (
                <tr>
                  <td>Summary</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{formatMoney(summarySpent)}</td>
                </tr>
              )}
              {hasAnalysis && (
                <tr>
                  <td>Analysis</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{formatMoney(analysisSpent)}</td>
                </tr>
              )}
              {hasWorld && (
                <tr>
                  <td>World</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{formatMoney(worldSpent)}</td>
                </tr>
              )}
              <tr className={styles.total}>
                <td colSpan={3}>Total</td>
                <td>{formatMoney(report.data.totalUsd)}</td>
              </tr>
            </tbody>
          </table>
          {report.data.inFlight.calls > 0 && (
            <p className={styles.muted}>
              In flight: {report.data.inFlight.calls} calls, reserved{' '}
              {formatMoney(report.data.inFlight.reservedUsd)}.
            </p>
          )}
        </>
      )}
    </Modal>
  );
};
