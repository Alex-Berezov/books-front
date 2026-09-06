import type { FC } from 'react';
import styles from '../SlugInput.module.scss';

/**
 * Shown when the uniqueness check could not answer at all - a network or auth
 * failure, not a taken slug (LEGACY-142).
 *
 * It says outright that saving is still allowed: the check is an early warning,
 * not the authority. The database is, and it answers on save.
 */
export const UnknownCheckNotice: FC = () => {
  return (
    <span className={styles.hint}>
      Could not verify slug uniqueness right now. You can still save - the server will reject a
      duplicate.
    </span>
  );
};
