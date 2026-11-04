'use client';

import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from './SummaryTab.module.scss';

/**
 * Ход «Write Summary» записал поле, но свежий текст сервера прочитать не удалось (F06-5c): Save поля
 * закрыт, пока текст не выяснен, — иначе он вернул бы в поле прежний текст поверх записанного.
 */
export const ServerTextUnknown: FC<{ field: string; onRetry: () => void }> = ({
  field,
  onRetry,
}) => (
  <p className={styles.error} role="alert">
    Could not load the server text of “{field}”; saving it is off until it loads.{' '}
    <Button variant="link" onClick={onRetry}>
      Retry
    </Button>
  </p>
);
