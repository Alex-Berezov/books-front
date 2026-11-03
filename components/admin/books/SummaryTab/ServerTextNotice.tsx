'use client';

import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from './SummaryTab.module.scss';

/**
 * Ход «Write Summary» записал поле на сервере, а в форме несохранённая правка (F06-3): правка
 * не затирается молча — редактор решает, взять ли текст сервера.
 */
export const ServerTextNotice: FC<{ field: string; onLoad: () => void }> = ({ field, onLoad }) => (
  <p className={styles.labelHint} role="status">
    “{field}” was changed on the server; your unsaved edits are kept.{' '}
    <Button variant="link" onClick={onLoad}>
      Load the server text
    </Button>{' '}
    (your edits are lost).
  </p>
);
