'use client';

import type { FC } from 'react';
import type { AnalysisBlockChangedBody } from '@/types/api-schema';
import styles from './AnalysisWrite.module.scss';

/**
 * 409 `ANALYSIS_BLOCK_CHANGED` на «Accept» (F07 `product.md` §4): блок изменили после предложения —
 * показ того, что в нём сейчас, вместо записи. Строка — как есть, список — JSON, как в форме вкладки.
 */
export const BlockConflict: FC<{ body: AnalysisBlockChangedBody }> = ({ body }) => {
  const { current } = body;
  const empty = current === null || current === undefined || current === '';
  return (
    <div role="alert">
      <p className={styles.error}>
        The block was changed after this proposal and is not overwritten. It holds now:
      </p>
      {empty ? (
        <p className={styles.hint}>(empty)</p>
      ) : (
        <pre className={styles.preview}>
          {typeof current === 'string' ? current : JSON.stringify(current, null, 2)}
        </pre>
      )}
    </div>
  );
};
