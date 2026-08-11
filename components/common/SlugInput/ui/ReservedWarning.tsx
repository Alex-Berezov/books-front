import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import type { ReservedWarningProps } from '../SlugInput.types';
import styles from '../SlugInput.module.scss';

/**
 * Warning for a slug the site's own routing already owns.
 *
 * Deliberately separate from `DuplicateWarning`: a taken slug has an owner to
 * show, a reserved one has none. The failure it prevents is quieter than a
 * duplicate — the page would save, look correct in the admin list, and simply
 * never be reachable, because the router answers that path first.
 */
export const ReservedWarning: FC<ReservedWarningProps> = (props) => {
  const { slug, suggestedSlug, onUseSuggested } = props;

  return (
    <div className={styles.warningBox}>
      <div className={styles.warningHeader}>
        <span className={styles.warningIcon}>⚠️</span>
        <strong>Slug is reserved by a site route</strong>
      </div>
      <div className={styles.warningContent}>
        <p>
          <code>{slug}</code> is already a section of the site, so a page saved under it would never
          open — the section wins the address.
        </p>

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
