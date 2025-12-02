'use client';

import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import type { SummaryTabProps } from './SummaryTab.types';
import { SummaryFormField } from './SummaryFormField';
import styles from './SummaryTab.module.scss';
import { useSummaryTab } from './useSummaryTab';

/**
 * Tab for managing book summary
 *
 * Allows editing:
 * - Summary text (brief overview)
 * - Key takeaways (main conclusions)
 * - Themes and analysis (themes and analysis)
 */
export const SummaryTab: FC<SummaryTabProps> = (props) => {
  const { formData, handleFieldChange, handleSave } = useSummaryTab(props);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Book Summary</h2>

      <SummaryFormField
        hint="Brief overview of the book"
        id="summaryText"
        label="Summary"
        onChange={handleFieldChange}
        placeholder="Write a concise summary of the book..."
        rows={8}
        value={formData.summaryText}
      />

      <SummaryFormField
        hint="Main lessons or insights"
        id="keyTakeaways"
        label="Key Takeaways"
        onChange={handleFieldChange}
        placeholder="List the main takeaways from the book..."
        rows={6}
        value={formData.keyTakeaways}
      />

      <SummaryFormField
        hint="Major themes and deeper analysis"
        id="themes"
        label="Themes & Analysis"
        onChange={handleFieldChange}
        placeholder="Describe the main themes and provide analysis..."
        rows={6}
        value={formData.themes}
      />

      <Button onClick={handleSave}>Save Summary</Button>
    </div>
  );
};
