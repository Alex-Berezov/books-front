'use client';

import { useCallback, type FC } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import type { SummaryTabProps } from './SummaryTab.types';
import type { SummaryWriteField } from './SummaryWrite/summaryWrite.utils';
import { ServerTextNotice } from './ServerTextNotice';
import { ServerTextUnknown } from './ServerTextUnknown';
import { SummaryFormField } from './SummaryFormField';
import { SummarySections } from './SummarySections';
import styles from './SummaryTab.module.scss';
import { useSummaryTab } from './useSummaryTab';

// Ход «Write Summary» — только у `admin` (F06-3): в бандл страницы версии не входит.
const SummaryWrite = dynamic(() => import('./SummaryWrite').then((m) => m.SummaryWrite), {
  ssr: false,
});

/**
 * Tab for managing book summary
 *
 * The plot retelling shown on the public page `/{lang}/book/{slug}/summary`, the very short summary
 * (the "In brief" block on top of it, F04) and the summary sections (`/summary/{n}`, F04).
 * Key takeaways and themes live in the «Analysis» tab (own `BookAnalysis` record, F03).
 */
export const SummaryTab: FC<SummaryTabProps> = (props) => {
  const {
    formData,
    handleFieldChange,
    handleSave,
    handleSaveBrief,
    reloadFields,
    unknownFields,
    retryReload,
    serverUpdates,
    showsServerText,
    loadServerText,
    hasFullSummary,
    briefMinutes,
    isLoading,
    isSaving,
    isSavingBrief,
    loadFailed,
  } = useSummaryTab(props);
  const { isAdmin = false, lang = 'en', versionId } = props;
  // Ход зовёт его из эффекта: одна функция на всю жизнь вкладки, без лишних перезапусков.
  const onFieldsWritten = useCallback(
    (fields: SummaryWriteField[]) => void reloadFields(fields),
    [reloadFields]
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Book Summary</h2>

      {isAdmin && (
        <SummaryWrite versionId={versionId} lang={lang} onFieldsWritten={onFieldsWritten} />
      )}

      {loadFailed ? (
        <p className={styles.error} role="alert">
          Failed to load the summary. Reload the tab before editing.
        </p>
      ) : (
        <>
          <SummaryFormField
            hint="Plot only, including the ending; use Heading 2 for parts or chapters. Public page: /book/<slug>/summary"
            id="summaryText"
            label="Summary"
            onChange={handleFieldChange}
            placeholder="Retell the plot of the book in order..."
            rows={24}
            value={formData.summaryText}
          />
          {showsServerText('summaryText') && (
            <ServerTextNotice
              field="Summary"
              text={serverUpdates.summaryText ?? ''}
              onLoad={() => loadServerText('summaryText')}
            />
          )}

          {unknownFields.includes('summaryText') && (
            <ServerTextUnknown field="Summary" onRetry={retryReload} />
          )}

          <Button
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving || isSavingBrief || unknownFields.includes('summaryText')}
          >
            Save Summary
          </Button>

          <SummaryFormField
            hint='3-5 min read, whole plot including the ending. Not the spoiler-free teaser "Summary (Short, 80-160 words)" on the book page'
            id="briefText"
            label="Very short summary"
            onChange={handleFieldChange}
            placeholder="The whole plot in a few paragraphs..."
            rows={8}
            value={formData.briefText}
          />
          {showsServerText('briefText') && (
            <ServerTextNotice
              field="Very short summary"
              text={serverUpdates.briefText ?? ''}
              onLoad={() => loadServerText('briefText')}
            />
          )}
          {unknownFields.includes('briefText') && (
            <ServerTextUnknown field="Very short summary" onRetry={retryReload} />
          )}
          <p className={styles.readingTime} aria-live="polite">
            Reading time: {briefMinutes} min
          </p>
          {!hasFullSummary && <p className={styles.labelHint}>Save the Summary first.</p>}
          <Button
            onClick={handleSaveBrief}
            loading={isSavingBrief}
            disabled={
              isSaving || isSavingBrief || !hasFullSummary || unknownFields.includes('briefText')
            }
          >
            Save Very Short Summary
          </Button>
        </>
      )}

      <SummarySections versionId={versionId} />
    </div>
  );
};
