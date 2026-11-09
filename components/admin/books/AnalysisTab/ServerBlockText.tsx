'use client';

import type { FC } from 'react';
import styles from './AnalysisTab.module.scss';

/**
 * Блок изменили на сервере, а в форме несохранённая правка (решение арбитра `T173 | LEGACY-496`):
 * чужой текст виден рядом с полем, своё не теряется; «Save» перезапишет его осознанно.
 */
export const ServerBlockText: FC<{ text: string | undefined }> = ({ text }) =>
  text === undefined ? null : (
    <div role="status">
      <p className={styles.hint}>Changed on the server; your edits are kept. It holds now:</p>
      {text === '' ? (
        <p className={styles.hint}>(empty)</p>
      ) : (
        <pre className={styles.serverText}>{text}</pre>
      )}
    </div>
  );
