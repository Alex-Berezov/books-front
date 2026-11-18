'use client';

import { useState, type FC } from 'react';
import { Alert, Button } from 'antd';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useBookVersion, useVersionTranslationRuns } from '@/api/hooks';
import { Spinner } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';
import { RunOverview } from '../RunOverview';
import { TranslateButton } from '../TranslateButton';
import { refusalText } from '../translationRun.utils';
import styles from './TranslationRunScreen.module.scss';

// Ход и история — только в раскрытых деталях: своими чанками, а не в бандле экрана.
const TranslationRunBlock = dynamic(
  () => import('../TranslationRunBlock').then((m) => m.TranslationRunBlock),
  { ssr: false, loading: () => <Spinner /> }
);
const RunHistory = dynamic(() => import('../RunHistory').then((m) => m.RunHistory), {
  ssr: false,
  loading: () => <Spinner />,
});

export interface TranslationRunScreenProps {
  versionId: string;
  lang: SupportedLang;
}

/**
 * Экран перевода версии — отдельная страница вместо блока над вкладками версии: вверху сводка
 * идущих и последнего запуска (закончено ли, итог, разбивка), подробный ход и история — свёрнуты
 * внизу. Страница пускает только `admin`.
 */
export const TranslationRunScreen: FC<TranslationRunScreenProps> = ({ versionId, lang }) => {
  const version = useBookVersion(versionId);
  // Детали монтируются только раскрытыми: закрытый <details> всё равно рендерит детей, а ход
  // и история опрашивают сервер и грузят свои чанки.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const backHref = `/admin/${lang}/books/versions/${versionId}`;
  const back = (
    <Link href={backHref} className={styles.back}>
      <ArrowLeft size={16} /> Back to the version
    </Link>
  );

  if (version.isError) {
    return (
      <div className={styles.screen}>
        {back}
        <Alert
          className={styles.alert}
          type="error"
          message={refusalText(version.error)}
          action={
            <Button size="small" onClick={() => void version.refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }
  if (!version.data) return <Spinner size="lg" />;
  const { bookId } = version.data;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          {back}
          <h1 className={styles.title}>Translation</h1>
          <p className={styles.meta}>
            {version.data.title} • {version.data.language.toUpperCase()}
          </p>
        </div>
        <TranslateButton versionId={versionId} bookId={bookId} />
      </header>
      <RunOverviews versionId={versionId} bookId={bookId} />
      <details className={styles.details} onToggle={(e) => setDetailsOpen(e.currentTarget.open)}>
        <summary className={styles.detailsSummary}>
          Details: progress by language, pause and resume, models, drafts and run history
        </summary>
        {detailsOpen && (
          <div className={styles.detailsBody}>
            <TranslationRunBlock versionId={versionId} bookId={bookId} lang={lang} />
            <RunHistory versionId={versionId} bookId={bookId} lang={lang} />
          </div>
        )}
      </details>
    </div>
  );
};

/** Сводки идущих запусков версии (по языку на запуск) или её последнего. */
const RunOverviews: FC<{ versionId: string; bookId: string }> = ({ versionId, bookId }) => {
  const { runs, error, isLoading, refetch } = useVersionTranslationRuns(bookId, versionId);
  if (error) {
    return (
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
    );
  }
  if (runs.length === 0) {
    if (isLoading) {
      return (
        <div data-testid="runs-loading">
          <Spinner />
        </div>
      );
    }
    return <p className={styles.empty}>This version has not been translated yet.</p>;
  }
  return (
    <>
      {runs.map((r) => (
        <RunOverview key={r.id} runId={r.id} bookId={bookId} />
      ))}
    </>
  );
};
