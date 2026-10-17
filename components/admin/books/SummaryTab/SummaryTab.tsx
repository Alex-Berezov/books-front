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
 * One field: the plot retelling shown on the public page `/{lang}/book/{slug}/summary`.
 * Key takeaways and themes live in the «Analysis» tab (own `BookAnalysis` record, F03).
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
        rows={24}
        value={formData.summaryText}
      />

      <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
        Save Summary
      </Button>
    </div>
  );
};
