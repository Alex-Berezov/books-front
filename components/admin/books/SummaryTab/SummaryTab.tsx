'use client';

import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import type { SummaryTabProps } from './SummaryTab.types';
import { SummaryFormField } from './SummaryFormField';
import styles from './SummaryTab.module.scss';
import { useSummaryTab } from './useSummaryTab';

/**
 * Tab for managing book summary
 *
 * Allows editing:
 * - Summary text - the plot retelling shown on the public page `/{lang}/book/{slug}/summary`
 * - Key takeaways and Themes & Analysis - stored, but not shown on the summary page:
 *   analysis belongs to its own section (owner decision 17.10.2026)
 */
export const SummaryTab: FC<SummaryTabProps> = (props) => {
  const { formData, handleFieldChange, handleSave, isLoading, isSaving } = useSummaryTab(props);

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

      <SummaryFormField
        hint="Plot only, including the ending; use Heading 2 for parts or chapters. Public page: /book/<slug>/summary"
        id="summaryText"
        label="Summary"
        onChange={handleFieldChange}
        placeholder="Retell the plot of the book in order..."
        rows={8}
        value={formData.summaryText}
      />

      <SummaryFormField
        hint="Not shown on the summary page"
        id="keyTakeaways"
        label="Key Takeaways"
        onChange={handleFieldChange}
        placeholder="List the main takeaways from the book..."
        rows={6}
        value={formData.keyTakeaways}
      />

      <SummaryFormField
        hint="Not shown on the summary page"
        id="themes"
        label="Themes & Analysis"
        onChange={handleFieldChange}
        placeholder="Describe the main themes and provide analysis..."
        rows={6}
        value={formData.themes}
      />

      <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
        Save Summary
      </Button>
    </div>
  );
};
