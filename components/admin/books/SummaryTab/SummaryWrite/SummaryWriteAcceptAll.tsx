'use client';

import type { FC } from 'react';
import { refusalCode } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { Button } from '@/components/admin/common/Button';
import type { SummaryWrite } from '@/types/api-schema';
import { FieldConflict } from './FieldConflict';
import styles from './SummaryWrite.module.scss';
import {
  acceptedIndexesOf,
  fieldChangedOf,
  itemTitle,
  refusalText,
  stoppedItemOf,
} from './summaryWrite.utils';

export interface SummaryWriteAcceptAllProps {
  run: SummaryWrite;
  pending: boolean;
  /** Ход не перечитывается: на экране может быть устаревшее. */
  disabled: boolean;
  /** Отказ последнего «Accept all» этого хода; `null` — не было. */
  error: unknown;
  /** Тексты хода на момент нажатия «Accept all» — по ним называется, на чём встали. */
  itemsAtFailure: SummaryWrite['items'];
  onAcceptAll: () => void;
}

/**
 * «Accept all» (F06 `product.md` §4-§5): все предложения по одному. Раздел, меняющий главы
 * читалки, — только по одному, кнопка недоступна. Отказ посреди — что уже принято, на каком
 * тексте встал и почему (свежие данные поля, раздел, который должен прийти первым).
 */
export const SummaryWriteAcceptAll: FC<SummaryWriteAcceptAllProps> = ({
  run,
  pending,
  disabled,
  error,
  itemsAtFailure,
  onAcceptAll,
}) => {
  const blocked = run.chapterChanges;
  // Списка нет (отказ до первой записи, сеть, 5xx) — на каком тексте встали, неизвестно.
  const accepted = acceptedIndexesOf(error);
  const changed = fieldChangedOf(error);
  const stop = stoppedItemOf(itemsAtFailure, error);
  const acceptedTitles = (accepted ?? [])
    .map((index) => itemsAtFailure.find((i) => i.index === index))
    .filter((i) => i !== undefined)
    .map(itemTitle);

  return (
    <>
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={onAcceptAll}
          loading={pending}
          disabled={blocked.length > 0 || pending || disabled}
        >
          Accept all
        </Button>
        {blocked.length > 0 && (
          <p className={styles.hint}>
            Accept all is not available: section{blocked.length > 1 ? 's' : ''} {blocked.join(', ')}{' '}
            move{blocked.length > 1 ? '' : 's'} to other reader chapters. Accept those sections one
            by one.
          </p>
        )}
      </div>
      {error !== null && (
        <div role="alert">
          {changed ? (
            <FieldConflict body={changed} subject={stop ? itemTitle(stop) : undefined} />
          ) : refusalCode(error) === 'ACCEPT_ALL_CHAPTER_CHANGE' ? (
            <p className={styles.error}>
              Some sections move to other reader chapters: accept those sections one by one.
            </p>
          ) : (
            <p className={styles.error}>{refusalText(error)}</p>
          )}
          {!changed && stop && <p className={styles.hint}>Stopped at: {itemTitle(stop)}.</p>}
          {acceptedTitles.length > 0 && (
            <p className={styles.hint}>Already accepted: {acceptedTitles.join(', ')}.</p>
          )}
        </div>
      )}
    </>
  );
};
