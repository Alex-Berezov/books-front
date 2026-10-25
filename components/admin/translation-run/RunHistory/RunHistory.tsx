'use client';

import { useEffect, useState, type FC } from 'react';
import { Alert, Button } from 'antd';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslationRunHistory } from '@/api/hooks';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { Pagination } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';
import { DRAFT_LINK_TEXT, refusalText, runStatusText } from '../translationRun.utils';
import styles from './RunHistory.module.scss';
import { authorText, languageResultText, stageModelText } from './runHistory.utils';

const RunReportModal = dynamic(() => import('../RunReportModal').then((m) => m.RunReportModal), {
  ssr: false,
});

export interface RunHistoryProps {
  versionId: string;
  bookId: string;
  lang: SupportedLang;
}

/**
 * История запусков перевода версии-исходника (F05-8, `product.md` §2.3; решение арбитра
 * `F05 | F05-8`, В3): все запуски, новые первыми, вместе с идущими — у каждого свой отчёт.
 * Страница рисует блок только `admin`; запусков нет — блока нет.
 */
export const RunHistory: FC<RunHistoryProps> = ({ versionId, bookId, lang }) => {
  const [page, setPage] = useState(1);
  const [reportRunId, setReportRunId] = useState<string | null>(null);
  const history = useTranslationRunHistory(bookId, versionId, page);
  const pagination = history.data?.pagination;
  const lastPage = Math.max(pagination?.totalPages ?? 1, 1);

  // Страница опустела после перечитывания (запуски удалены вместе с версией): на последнюю.
  useEffect(() => {
    if (pagination && page > lastPage) setPage(lastPage);
  }, [pagination, page, lastPage]);

  const failure = history.isError && (
    <Alert
      className={styles.alert}
      type="error"
      message={`Translation history: ${refusalText(history.error)}`}
      action={
        <Button size="small" onClick={() => void history.refetch()}>
          Retry
        </Button>
      }
    />
  );
  // Не перечиталось при уже показанной странице — плашка над таблицей, строки и страницы на месте.
  if (!pagination) return failure || null;
  if (pagination.total === 0) return null;
  const items = history.data?.items ?? [];
  const reported = items.find((r) => r.id === reportRunId);

  return (
    <section className={styles.block} aria-label="Translation history">
      <h2 className={styles.title}>Translation history</h2>
      {failure}
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Started</th>
              <th>By</th>
              <th>Models</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Languages</th>
              <th aria-label="Report" />
            </tr>
          </thead>
          <tbody>
            {items.map((run) => (
              <tr key={run.id}>
                <td>{new Date(run.createdAt).toLocaleString()}</td>
                <td>{authorText(run.createdBy)}</td>
                <td>
                  <ul className={styles.list}>
                    {run.models.map((m) => (
                      <li key={m.stage}>{stageModelText(m)}</li>
                    ))}
                  </ul>
                </td>
                <td>{formatMoney(run.costUsd)}</td>
                <td>{runStatusText(run.operation)}</td>
                <td>
                  <ul className={styles.list}>
                    {run.results.map((r) => (
                      <li key={r.language}>
                        {languageResultText(r)}
                        {r.draftVersionId && (
                          <>
                            {' '}
                            <Link href={`/admin/${lang}/books/versions/${r.draftVersionId}`}>
                              {DRAFT_LINK_TEXT}
                            </Link>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <Button size="small" onClick={() => setReportRunId(run.id)}>
                    Report
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lastPage > 1 && (
        <Pagination currentPage={page} totalPages={lastPage} onPageChange={setPage} />
      )}
      {reportRunId && (
        <RunReportModal
          runId={reportRunId}
          lang={lang}
          // Живой — по последнему чтению истории, а не по моменту клика: запуск мог закончиться.
          live={reported?.operation.status === 'active'}
          onClose={() => setReportRunId(null)}
        />
      )}
    </section>
  );
};
