'use client';

import type { FC } from 'react';
import { RichTextContent } from '@/components/common/RichTextContent';
import type { SummaryFieldChangedBody } from '@/types/api-schema';
import styles from './SummaryWrite.module.scss';

export interface FieldConflictProps {
  body: SummaryFieldChangedBody;
  /** Какой текст отказал (у «Accept all»: на нём ход встал). */
  subject?: string;
}

/**
 * 409 `SUMMARY_FIELD_CHANGED` (F06 `product.md` §4): поле изменили после предложения — показ того,
 * что в нём сейчас, вместо записи; раздел сверх последнего номера (`expectedNumber`) — выход:
 * принять раздел перед ним (отброшенный — перегенерировать и принять). Раздел, дописанный руками,
 * сервер не засчитывает (`appendAllowed`).
 */
export const FieldConflict: FC<FieldConflictProps> = ({ body, subject }) => {
  // «Section 2 must…» без текста-виновника, «Full summary: section 2 must…» — с ним.
  const lead = (text: string) =>
    subject ? `${subject}: ${text}` : `${text[0].toUpperCase()}${text.slice(1)}`;
  if (body.expectedNumber !== undefined) {
    const n = body.expectedNumber;
    return (
      <p className={styles.error}>
        {lead(
          `section ${n} must come first: accept section ${n} first; if it was discarded, regenerate it and accept it. A section written by hand does not count here.`
        )}
      </p>
    );
  }
  const current = body.current;
  if (current === null || current === undefined) {
    return (
      <p className={styles.error}>
        {lead(
          'the field was changed after this proposal; the server did not send the current text: reload the tab.'
        )}
      </p>
    );
  }
  return (
    <>
      <p className={styles.error}>
        {lead('the field was changed after this proposal and is not overwritten. It holds now:')}
      </p>
      {current.title !== undefined && (
        <p className={styles.hint}>
          Title: {current.title}
          {current.readerChapter != null ? `, reader chapter ${current.readerChapter}` : ''}
        </p>
      )}
      {current.text ? (
        <RichTextContent html={current.text} className={styles.preview} />
      ) : (
        <p className={styles.hint}>(empty)</p>
      )}
    </>
  );
};
