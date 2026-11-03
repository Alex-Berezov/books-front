'use client';

import type { FC } from 'react';
import type { SummaryWriteItem } from '@/types/api-schema';
import styles from './SummaryWrite.module.scss';
import { reviewSkippedText } from './summaryWrite.utils';

/**
 * Отметка проверки текста (F06 `product.md` §5): «Model check: OK», «Model flags (N)»
 * с раскрывающимся списком замечаний (код, место, объяснение) и подпись, что проверяла модель,
 * а не человек; проверки моделью не было — так и сказано, с причиной. У «не удалось» отметки нет.
 */
export const ItemCheck: FC<{ item: SummaryWriteItem }> = ({ item }) => {
  if (item.verdict === 'failed') return null;
  const skipped = reviewSkippedText(item.review);
  return (
    <>
      {item.verdict === 'ok' && <span className={styles.checkOk}>Model check: OK</span>}
      {item.verdict === 'flags' && item.remarks.length > 0 && (
        <details className={styles.remarks}>
          <summary className={styles.checkFlags}>Model flags ({item.remarks.length})</summary>
          <ul className={styles.remarkList}>
            {item.remarks.map((r, i) => (
              <li key={i}>
                <strong>{r.code}</strong> — {r.where}: {r.note}{' '}
                {r.by === 'code' ? '(code check)' : '(model)'}
              </li>
            ))}
          </ul>
        </details>
      )}
      {skipped ? (
        <p className={styles.hint}>{skipped}</p>
      ) : (
        <p className={styles.hint}>Checked by the model, not by a human.</p>
      )}
    </>
  );
};
