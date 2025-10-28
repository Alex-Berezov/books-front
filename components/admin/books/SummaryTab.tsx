'use client';

import { useState } from 'react';
import type { FC } from 'react';
import styles from './SummaryTab.module.scss';

/**
 * Пропсы компонента SummaryTab
 */
export interface SummaryTabProps {
  /** ID версии книги */
  versionId: string;
}

/**
 * Таб для управления саммари книги
 *
 * Позволяет редактировать:
 * - Summary text (краткое содержание)
 * - Key takeaways (ключевые выводы)
 * - Themes и analysis (темы и анализ)
 */
export const SummaryTab: FC<SummaryTabProps> = (props) => {
  const { versionId } = props;

  // Локальное состояние для полей саммари
  const [summaryText, setSummaryText] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [themes, setThemes] = useState('');

  /**
   * Обработчик сохранения саммари
   */
  const handleSave = () => {
    // TODO (M3.2.3): Реализовать сохранение саммари
    console.log('Save summary for version:', versionId, {
      keyTakeaways,
      summaryText,
      themes,
    });
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
