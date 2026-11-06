'use client';

import type { FC } from 'react';
import { Alert, Spin } from 'antd';
import Link from 'next/link';
import { useTranslationRunReport } from '@/api/hooks';
import { Modal } from '@/components/admin/common/Modal';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { TranslationReportLanguage } from '@/types/api-schema';
import { analysisLineOf, sumAnalysisSpent } from '../analysisLine.utils';
import { FindingItem } from '../FindingItem';
import { SectionLineView } from '../SectionLineView';
import { sumSummarySpent } from '../summaryLine.utils';
import { SummaryLineView } from '../SummaryLineView';
import {
  DRAFT_LINK_TEXT,
  failedText,
  FINAL_CHECK_TEXT,
  findingText,
  languageStatusText,
  refusalText,
  rewriteRefusalText,
  stageName,
} from '../translationRun.utils';
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
                  <td>{stageName(c.stage)}</td>
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

const LanguageReport: FC<{
  report: TranslationReportLanguage;
  lang: SupportedLang;
  writeSummary: boolean;
  writeAnalysis: boolean;
}> = ({ report: l, lang, writeSummary, writeAnalysis }) => {
  // Строка анализа: и без флага списка, если анализ у языка есть; строки нет (язык `done` без
  // анализа) — без пустого абзаца.
  const analysisLine = analysisLineOf(writeAnalysis || l.analysis != null, {
    status: l.status,
    analysis: l.analysis ?? null,
  });
  // Находки от текста до повтора или правки (`stale`) показаны приглушёнными; отказ перезаписи — своей строкой.
  const flagged = l.chapters.filter(
    (c) => c.findings.length > 0 || c.flagReason !== null || c.rewriteRefusal !== null
  );
  return (
    <section className={styles.language} aria-label={`Report ${l.language}`}>
      <h3 className={styles.subtitle}>
        {l.language.toUpperCase()}: {languageStatusText(l.status)}
      </h3>
      {l.status === 'failed' && <p>{failedText(l)}</p>}
      <p>
        {l.draftVersionId ? (
          <Link href={`/admin/${lang}/books/versions/${l.draftVersionId}`}>{DRAFT_LINK_TEXT}</Link>
        ) : (
          'No draft version.'
        )}{' '}
        {/* Ноль глав при черновике показывается явно (решение арбитра 24.10.2026, 6b круг 5 В1). */}
        Chapters written: {l.writtenChapters}.
      </p>
      {(writeSummary || l.summary) && (
        <p>
          <SummaryLineView
            writeSummary={writeSummary || l.summary !== null}
            language={l}
            draftVersionId={l.draftVersionId}
            lang={lang}
          />
          {l.summary && ` · spent ${formatMoney(l.summary.spentUsd)}`}
        </p>
      )}
      {analysisLine && (
        <p>
          <SectionLineView
            line={analysisLine}
            tab="analysis"
            draftVersionId={l.draftVersionId}
            lang={lang}
          />
          {l.analysis && ` · spent ${formatMoney(l.analysis.spentUsd)}`}
        </p>
      )}
      <p>
        Pieces: {l.chunks.total}, retries: {l.chunks.retries}, flagged: {l.flaggedChunks}
        {l.chunks.flagged.length > 0 &&
          ` (${l.chunks.flagged.map((f) => `${findingText(f.reason)}: ${f.count}`).join(', ')})`}
        . Flagged chapters: {l.flaggedChapters}.
      </p>
      <p>
        Final check: {FINAL_CHECK_TEXT[l.finalCheck.status]}
        {l.finalCheck.status === 'done' && `, chapters checked ${l.finalCheck.chaptersChecked}`}
        {l.finalCheck.missingChapters.length > 0 &&
          `, missing chapters ${l.finalCheck.missingChapters.join(', ')}`}
        .
      </p>
      {/* Автор вне глоссария (`product.md` §2.4, решение `F05 | F05-6`): только при черновике; null -
          этап полей версии не дошёл или автора нет ни у исходника, ни в ответе (решение `F05 | F05-17`). */}
      {l.draftVersionId && l.authorFromGlossary === false && (
        <p>
          Author name in the draft: not from the glossary — translated or transliterated by the
          model, check it.
        </p>
      )}
      {l.notWrittenChapters.length > 0 && (
        <p>Chapters not in the draft: {l.notWrittenChapters.join(', ')}.</p>
      )}
      {l.takenChapters.length > 0 && (
        <p>Chapter numbers taken by other chapters in the draft: {l.takenChapters.join(', ')}.</p>
      )}
      {flagged.length > 0 && (
        <ul className={styles.findings}>
          {flagged.map((c) => (
            <li key={c.number}>
              Chapter {c.number}
              {c.flagReason ? `: ${findingText(c.flagReason)}` : ''}
              {c.rewriteRefusal && (
                <p className={styles.muted}>
                  Not rewritten after a retry or edit: {rewriteRefusalText(c.rewriteRefusal)}.
                </p>
              )}
              {c.findings.length > 0 && (
                <ul>
                  {c.findings.map((f, i) => (
                    <FindingItem key={i} finding={f} />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
