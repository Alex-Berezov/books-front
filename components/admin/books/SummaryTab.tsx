'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { useSnackbar } from 'notistack';
import styles from './SummaryTab.module.scss';

/**
 * SummaryTab component props
 */
export interface SummaryTabProps {
  /** Book version ID */
  versionId: string;
}

/**
 * Tab for managing book summary
 *
 * Allows editing:
 * - Summary text (brief overview)
 * - Key takeaways (main conclusions)
 * - Themes and analysis (themes and analysis)
 */
export const SummaryTab: FC<SummaryTabProps> = (props) => {
  const { versionId: _versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  // Local state for summary fields
  const [summaryText, setSummaryText] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [themes, setThemes] = useState('');

  /**
   * Summary save handler
   */
  const handleSave = () => {
    // TODO (M3.2.3): Implement summary saving
    enqueueSnackbar('Summary saving not yet implemented', { variant: 'info' });
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Book Summary</h2>

      {/* Summary Text */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="summaryText">
          Summary
          <span className={styles.labelHint}>(Brief overview of the book)</span>
        </label>
        <textarea
          className={styles.textarea}
          id="summaryText"
          onChange={(e) => setSummaryText(e.target.value)}
          placeholder="Write a concise summary of the book..."
          rows={8}
          value={summaryText}
        />
      </div>

      {/* Key Takeaways */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="keyTakeaways">
          Key Takeaways
          <span className={styles.labelHint}>(Main lessons or insights)</span>
        </label>
        <textarea
          className={styles.textarea}
          id="keyTakeaways"
          onChange={(e) => setKeyTakeaways(e.target.value)}
          placeholder="List the main takeaways from the book..."
          rows={6}
          value={keyTakeaways}
        />
      </div>

      {/* Themes */}
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="themes">
          Themes & Analysis
          <span className={styles.labelHint}>(Major themes and deeper analysis)</span>
        </label>
        <textarea
          className={styles.textarea}
          id="themes"
          onChange={(e) => setThemes(e.target.value)}
          placeholder="Describe the main themes and provide analysis..."
          rows={6}
          value={themes}
        />
      </div>

      <button className={styles.saveButton} onClick={handleSave} type="button">
        Save Summary
      </button>
    </div>
  );
};
