'use client';

import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import type { SummaryTabProps } from './SummaryTab.types';
import { SummaryFormField } from './SummaryFormField';
import { SummarySections } from './SummarySections';
import styles from './SummaryTab.module.scss';
import { useSummaryTab } from './useSummaryTab';

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
    hasFullSummary,
    briefMinutes,
    isLoading,
    isSaving,
    isSavingBrief,
    loadFailed,
  } = useSummaryTab(props);

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

          <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
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
          <p className={styles.readingTime} aria-live="polite">
            Reading time: {briefMinutes} min
          </p>
          {!hasFullSummary && <p className={styles.labelHint}>Save the full summary first.</p>}
          <Button
            onClick={handleSaveBrief}
            loading={isSavingBrief}
            disabled={isSavingBrief || !hasFullSummary}
          >
            Save Very Short Summary
          </Button>
        </>
      )}

      <SummarySections versionId={props.versionId} />
    </div>
  );
};
