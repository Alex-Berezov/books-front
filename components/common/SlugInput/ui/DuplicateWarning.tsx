import type { FC } from 'react';
import type { DuplicateWarningProps } from '../SlugInput.types';
import styles from '../SlugInput.module.scss';

/**
 * Предупреждение о дублировании slug
 *
 * Показывается когда slug уже занят другой сущностью
 * Предлагает альтернативный slug
 */
export const DuplicateWarning: FC<DuplicateWarningProps> = (props) => {
  const { entityType, slug, existingItem, suggestedSlug, onUseSuggested } = props;

  const entityLabel = entityType === 'page' ? 'page' : 'book';

  return (
    <div className={styles.warningBox}>
      <div className={styles.warningHeader}>
        <span className={styles.warningIcon}>⚠️</span>
        <strong>Slug is already taken</strong>
      </div>
      <div className={styles.warningContent}>
        <p>
          A {entityLabel} with slug <code>{slug}</code> already exists:
        </p>
        <div className={styles.existingItem}>
          <div>
            <strong>{existingItem.title}</strong>
          </div>
          <div className={styles.existingItemMeta}>
            Status: <span className={styles.badge}>{existingItem.status}</span>
          </div>
        </div>

        {suggestedSlug && (
          <div className={styles.suggestion}>
            <p>Try using:</p>
            <button className={styles.suggestionButton} onClick={onUseSuggested} type="button">
              <code>{suggestedSlug}</code>
              <span className={styles.suggestionIcon}>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
