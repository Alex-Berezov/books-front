'use client';

import type { FC } from 'react';
import type { SummaryWriteReview } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';
import { reviewSkippedText } from './contentDraft.utils';

export interface ItemCheckProps {
  verdict: 'ok' | 'flags' | 'failed';
  /** Замечания, которые показываются (что не показывать — решает вызывающий). */
  remarks: { code: string; where: string; note: string; by: 'code' | 'model' }[];
  review: SummaryWriteReview | null;
}

/**
 * Отметка проверки текста или блока хода (F06 `product.md` §5, F07 §5): «Model check: OK»,
 * «Model flags (N)» с раскрывающимся списком замечаний (код, место, объяснение) и подпись, что
 * проверяла модель, а не человек; проверки моделью не было — так и сказано, с причиной.
 * Правило хода пересказа (F06-3): «OK» — по вердикту `ok`, флаги — по вердикту `flags` с замечаниями.
 * У «не удалось» отметки нет.
 */
export const ItemCheck: FC<ItemCheckProps> = ({ verdict, remarks, review }) => {
  if (verdict === 'failed') return null;
  const skipped = reviewSkippedText(review);
  return (
    <>
      {verdict === 'ok' && <span className={styles.checkOk}>Model check: OK</span>}
      {verdict === 'flags' && remarks.length > 0 && (
        <details className={styles.remarks}>
          <summary className={styles.checkFlags}>Model flags ({remarks.length})</summary>
          <ul className={styles.remarkList}>
            {remarks.map((r, i) => (
              <li key={i}>
                <strong>{r.code}</strong> — {r.where}: {r.note}{' '}
                {r.by === 'code' ? '(code check)' : '(model)'}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className={styles.hint}>{skipped ?? 'Checked by the model, not by a human.'}</p>
    </>
  );
};
