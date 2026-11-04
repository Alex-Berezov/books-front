'use client';

import type { FC } from 'react';
import { isRegenRunning } from '@/api/hooks';
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

/** Глава читалки раздела: `null` — главы нет в этой версии. */
const chapterText = (item: SummaryWriteItem): string | null =>
  item.target !== 'section'
    ? null
    : item.readerChapter === null
      ? 'Reader chapter: none in this version.'
      : `Reader chapter: ${item.readerChapter}.`;

/**
 * Судьба текста хода (F06 `product.md` §4): «не удалось» с причиной и выходом, ждущий раздел,
 * записан, предложение с превью, решение редактора, неудачная и идущая перегенерация.
 */
export const ItemStatus: FC<ItemStatusProps> = ({ item, ready, blockedBy }) => {
  const chapter = chapterText(item);
  return (
    <>
      {chapter && <p className={styles.hint}>{chapter}</p>}
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
          field; otherwise Accept is refused and names the section that must come first.
        </p>
      )}
      {OUTCOME_TEXT[item.outcome] && <p className={styles.hint}>{OUTCOME_TEXT[item.outcome]}</p>}
      {item.regenFailedReason && (
        <p className={styles.error}>
          Regeneration failed, the previous text is kept: {reasonText(item.regenFailedReason)}.
        </p>
      )}
      {/* На паузе — «Regeneration paused» с причиной и «Continue» (ItemResume), не «идёт». */}
      {isRegenRunning(item) && (
        <p className={styles.hint} role="status">
          Regenerating…
        </p>
      )}
      {item.html !== '' && isPending(item) && (
        <RichTextContent html={item.html} className={styles.preview} />
      )}
    </>
  );
};
