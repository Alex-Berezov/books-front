'use client';

import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from './SummaryTab.module.scss';

/**
 * Поле изменили на сервере, а в форме несохранённая правка (F06-3): правка не затирается молча,
 * текст сервера виден рядом как есть, разметкой не разбирается (решение арбитра `T173 | LEGACY-496`).
 */
export const ServerTextNotice: FC<{ field: string; text: string; onLoad: () => void }> = ({
  field,
  text,
  onLoad,
}) => (
  <div role="status">
    <p className={styles.labelHint}>
      “{field}” was changed on the server; your unsaved edits are kept.{' '}
      <Button variant="link" onClick={onLoad}>
        Load the server text
      </Button>{' '}
      (your edits are lost).
    </p>
    {text === '' ? (
      <p className={styles.labelHint}>(empty)</p>
    ) : (
      <pre className={styles.serverText}>{text}</pre>
    )}
  </div>
);
