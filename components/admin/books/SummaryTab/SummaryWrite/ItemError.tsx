'use client';

import type { FC } from 'react';
import { refusalCode } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import type { SummaryWriteItem } from '@/types/api-schema';
import { FieldConflict } from './FieldConflict';
import styles from './SummaryWrite.module.scss';
import { fieldChangedOf, refusalText } from './summaryWrite.utils';

export interface ItemErrorProps {
  item: SummaryWriteItem;
  error: unknown;
  /** Раздел, которого ждёт раздел `waiting`. */
  blockedBy: number;
}

/**
 * Отказ действия над текстом хода: 409 `SUMMARY_FIELD_CHANGED` — свежие данные поля; ждущий
 * раздел, которому «Accept» ответил `SUMMARY_ITEM_NOT_PROPOSED`, — какой раздел нужен раньше;
 * прочее — словами.
 */
export const ItemError: FC<ItemErrorProps> = ({ item, error, blockedBy }) => {
  const changed = fieldChangedOf(error);
  if (changed) {
    return (
      <div role="alert">
        <FieldConflict body={changed} />
      </div>
    );
  }
  const waits = item.outcome === 'waiting' && refusalCode(error) === 'SUMMARY_ITEM_NOT_PROPOSED';
  return (
    <p className={styles.error} role="alert">
      {waits
        ? `Section ${item.number} waits for section ${blockedBy}: regenerate section ${blockedBy}. Writing it by hand does not release this section: that takes a new paid Write Summary, which discards the proposals not accepted here.`
        : refusalText(error)}
    </p>
  );
};
