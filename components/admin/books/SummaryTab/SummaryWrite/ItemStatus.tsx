'use client';

import type { FC } from 'react';
import { RichTextContent } from '@/components/common/RichTextContent';
import type { SummaryWriteItem } from '@/types/api-schema';
import styles from './SummaryWrite.module.scss';
import { isPending, reasonText } from './summaryWrite.utils';

export interface ItemStatusProps {
  item: SummaryWriteItem;
  ready: boolean;
  /** Раздел, которого ждёт раздел `waiting` (первый перед ним без текста). */
  blockedBy: number;
}

const OUTCOME_TEXT: Partial<Record<SummaryWriteItem['outcome'], string>> = {
  written: 'Written to the field.',
  proposed: 'Proposal: Accept writes it to the field, Discard throws it away.',
  accepted: 'Accepted: written to the field.',
  discarded: 'Discarded.',
};

/** «Не удалось»: на готовом ходе — перегенерировать или руками, иначе только руками. */
const failedHint = (item: SummaryWriteItem, ready: boolean): string => {
  const byHand =
    item.target === 'section'
      ? 'write the section by hand (Add section)'
      : 'write the text by hand in the field below';
  return ready ? `Regenerate it or ${byHand}.` : `${byHand[0].toUpperCase()}${byHand.slice(1)}.`;
};

/**
 * Судьба текста хода (F06 `product.md` §4): «не удалось» с причиной и выходом, ждущий раздел,
 * записан, предложение с превью, решение редактора, неудачная и идущая перегенерация.
 */
export const ItemStatus: FC<ItemStatusProps> = ({ item, ready, blockedBy }) => (
  <>
    {item.verdict === 'failed' ? (
      <>
        <p className={styles.error}>Failed: {reasonText(item.failedReason)}.</p>
        <p className={styles.hint}>{failedHint(item, ready)}</p>
      </>
    ) : (
      item.outcome === 'none' && (
        <p className={styles.error}>Not in the field: {reasonText(item.failedReason)}.</p>
      )
    )}
    {item.outcome === 'waiting' && (
      <p className={styles.hint}>
        Waits for section {blockedBy}. Accept now writes it if every section before it is in the
        field; otherwise the server says which section must come first.
      </p>
    )}
    {OUTCOME_TEXT[item.outcome] && <p className={styles.hint}>{OUTCOME_TEXT[item.outcome]}</p>}
    {item.regenFailedReason && (
      <p className={styles.error}>
        Regeneration failed, the previous text is kept: {reasonText(item.regenFailedReason)}.
      </p>
    )}
    {item.regenerating && (
      <p className={styles.hint} role="status">
        Regenerating…
      </p>
    )}
    {item.html !== '' && isPending(item) && (
      <RichTextContent html={item.html} className={styles.preview} />
    )}
  </>
);
