import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import type { DuplicateWarningProps } from '../SlugInput.types';
import styles from '../SlugInput.module.scss';

/**
 * Slug duplication warning
 *
 * Shown when slug is already taken by another entity
 * Suggests alternative slug
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
            <Button
              className={styles.suggestionButton}
              onClick={onUseSuggested}
              variant="secondary"
              size="sm"
            >
              <code>{suggestedSlug}</code>
              <span className={styles.suggestionIcon}>→</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
