'use client';

import { useState, type FC } from 'react';
import { Alert, Button, Spin } from 'antd';
import dynamic from 'next/dynamic';
import { useTranslationRun, useTranslationSource, useVersionTranslationRuns } from '@/api/hooks';
import type { SupportedLang } from '@/lib/i18n/lang';
import { refusalText } from '../translationRun.utils';
import styles from './TranslationRunBlock.module.scss';

// Блок хода и окна грузятся, только когда нужны: страница версии и так тяжёлая.
const RunProgress = dynamic(() => import('../RunProgress').then((m) => m.RunProgress), {
  ssr: false,
});
const RunReportModal = dynamic(() => import('../RunReportModal').then((m) => m.RunReportModal), {
  ssr: false,
});
const StartRunModal = dynamic(() => import('../StartRunModal').then((m) => m.StartRunModal), {
  ssr: false,
});

export interface TranslationRunBlockProps {
  versionId: string;
  bookId: string;
  lang: SupportedLang;
}

interface RunItemProps {
  runId: string;
  bookId: string;
  lang: SupportedLang;
  onReport: (runId: string) => void;
  onRestart: () => void;
}

/** Ход одного запуска: свой опрос, свои кнопки, свой отказ с «Retry». */
const RunItem: FC<RunItemProps> = ({ runId, bookId, lang, onReport, onRestart }) => {
  const run = useTranslationRun(runId, bookId);
  if (run.isError) {
    return (
      <Alert
        className={styles.alert}
        type="error"
        message={refusalText(run.error)}
        // Опрос после отказа встаёт (тосты на каждый цикл); вернуть ход - этой кнопкой.
        action={
          <Button size="small" onClick={() => void run.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  if (!run.data) return null;
  return (
    <RunProgress
      run={run.data}
      bookId={bookId}
      lang={lang}
      onReport={() => onReport(runId)}
      onRestart={onRestart}
    />
  );
};

/**
 * Запуски перевода этой версии на её странице (F05-7, `product.md` §2.3–§2.4) — страница рисует
 * блок только `admin`. Все идущие и на паузе (по запуску на язык), иначе последний; запусков нет —
 * блока нет.
 */
export const TranslationRunBlock: FC<TranslationRunBlockProps> = ({ versionId, bookId, lang }) => {
  const { runs, error, refetch } = useVersionTranslationRuns(bookId, versionId);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const [restartOpen, setRestartOpen] = useState(false);
  const source = useTranslationSource(versionId, restartOpen);

  if (runs.length === 0 && !restartOpen && !error) return null;

  return (
    <>
      {error && (
        <Alert
          className={styles.alert}
          type="error"
          message={refusalText(error)}
          action={
            <Button size="small" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      )}
      {runs.map((r) => (
        <RunItem
          key={r.id}
          runId={r.id}
          bookId={bookId}
          lang={lang}
          onReport={setReportRunId}
          onRestart={() => setRestartOpen(true)}
        />
      ))}
      {reportRunId && (
        <RunReportModal
          runId={reportRunId}
          lang={lang}
          live={runs.some((r) => r.id === reportRunId && r.operation.status === 'active')}
          onClose={() => setReportRunId(null)}
        />
      )}
      {/* Запуск уже отменён: окно ждёт языки, а их отказ виден здесь, а не пропадает молча. */}
      {restartOpen && source.isFetching && !source.data && <Spin />}
      {restartOpen && source.isError && (
        <Alert
          className={styles.alert}
          type="error"
          message={`The run is cancelled, but the start window cannot open: ${refusalText(source.error)} Use "Translate to other languages" above.`}
          closable
          onClose={() => setRestartOpen(false)}
        />
      )}
      {restartOpen && source.data && (
        <StartRunModal
          isOpen
          onCancel={() => setRestartOpen(false)}
          onStarted={() => setRestartOpen(false)}
          versionId={versionId}
          bookId={bookId}
          source={source.data}
        />
      )}
    </>
  );
};
