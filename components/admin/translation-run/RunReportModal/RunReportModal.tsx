'use client';

import type { FC } from 'react';
import { Alert, Spin } from 'antd';
import Link from 'next/link';
import { useTranslationRunReport } from '@/api/hooks';
import { Modal } from '@/components/admin/common/Modal';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { TranslationReportLanguage } from '@/types/api-schema';
import {
  DRAFT_LINK_TEXT,
  failedText,
  FINAL_CHECK_TEXT,
  findingText,
  refusalText,
  stageName,
} from '../translationRun.utils';
import styles from './RunReportModal.module.scss';

export interface RunReportModalProps {
  runId: string;
  lang: SupportedLang;
  /** Запуск идёт: отчёт перечитывается, пока окно открыто. */
  live?: boolean;
  onClose: () => void;
}

/**
 * Отчёт запуска (F05-7, `product.md` §2.4): куски и повторы, флаги с причинами, главы
 * не в черновике, итоговая проверка, ссылка на черновик версии, стоимость по этапам и моделям.
 */
export const RunReportModal: FC<RunReportModalProps> = ({ runId, lang, live, onClose }) => {
  const report = useTranslationRunReport(runId, live);

  return (
    <Modal isOpen title="Translation report" size="xl" showFooter={false} onCancel={onClose}>
      {report.isLoading && <Spin />}
      {report.isError && <Alert type="error" message={refusalText(report.error)} />}
      {report.data && (
        <>
          {report.data.languages.map((l) => (
            <LanguageReport key={l.language} report={l} lang={lang} />
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

const LANGUAGE_STATUSES: Record<TranslationReportLanguage['status'], string> = {
  pending: 'waiting',
  running: 'in progress',
  done: 'done',
  failed: 'failed',
  cancelled: 'cancelled',
};

const LanguageReport: FC<{ report: TranslationReportLanguage; lang: SupportedLang }> = ({
  report: l,
  lang,
}) => {
  const flagged = l.chapters.filter((c) => c.findings.length > 0 || c.flagReason !== null);
  return (
    <section className={styles.language} aria-label={`Report ${l.language}`}>
      <h3 className={styles.subtitle}>
        {l.language.toUpperCase()}: {LANGUAGE_STATUSES[l.status]}
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
              {c.findings.length > 0 && (
                <ul>
                  {c.findings.map((f, i) => (
                    <li key={i}>
                      {findingText(f.code)}
                      {f.seam !== undefined && ` (seam ${f.seam})`}
                      {f.issue && `: ${f.issue}`}
                      {f.form && ` — ${f.form}${f.target ? ` → ${f.target}` : ''}`}
                    </li>
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
