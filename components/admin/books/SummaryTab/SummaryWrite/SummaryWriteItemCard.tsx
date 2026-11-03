'use client';

import { useState, type FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog } from '@/components/admin/shared';
import type { SummaryWriteActions } from '@/api/hooks';
import type { SummaryChapterChangeBody, SummaryWriteItem } from '@/types/api-schema';
import { ItemCheck } from './ItemCheck';
import { ItemError } from './ItemError';
import { ItemRegenerate } from './ItemRegenerate';
import { ItemStatus } from './ItemStatus';
import styles from './SummaryWrite.module.scss';
import {
  chapterChangeOf,
  chapterChangeText,
  fieldsOf,
  isPending,
  itemTitle,
  mayHaveWritten,
  type SummaryWriteField,
} from './summaryWrite.utils';

export interface SummaryWriteItemCardProps {
  runId: string;
  item: SummaryWriteItem;
  /** Ход готов: тексты можно принимать, отбрасывать и перегенерировать (иначе сервер ответит 409). */
  ready: boolean;
  /** Действия закрыты: идёт «Accept all» или ход не перечитывается. */
  disabled: boolean;
  /** Раздел, которого ждёт раздел `waiting` (первый перед ним без текста). */
  blockedBy: number;
  actions: Pick<SummaryWriteActions, 'accept' | 'discardItem' | 'regenerate'>;
  /** Полный или «Очень кратко» мог измениться на сервере: форма берёт это поле. */
  onFieldsWritten: (fields: SummaryWriteField[]) => void;
  /** «Accept» этого текста лёг. */
  onAccepted: () => void;
}

/**
 * Текст хода «Write Summary» (F06 `product.md` §4-§5): отметка проверки, судьба текста,
 * предложение с «Accept» / «Discard», «Regenerate» с замечанием. 409 «Accept» разбирается
 * на месте: свежие данные поля, подтверждение смены глав раздела, раздел, которого ждёт ждущий.
 */
export const SummaryWriteItemCard: FC<SummaryWriteItemCardProps> = ({
  runId,
  item,
  ready,
  disabled,
  blockedBy,
  actions,
  onFieldsWritten,
  onAccepted,
}) => {
  const [busy, setBusy] = useState(false);
  // Отказ — к тому тексту, на который ответил: новый текст или его судьба отказ снимают.
  const [failure, setFailure] = useState<{ of: string; error: unknown } | null>(null);
  const [chapterChange, setChapterChange] = useState<SummaryChapterChangeBody | null>(null);

  const id = `summary-write-item-${item.index}`;
  const shape = `${item.outcome}|${item.html}`;
  const error = failure?.of === shape ? failure.error : null;
  const locked = !ready || disabled || item.regenerating || busy;
  const vars = { id: runId, index: item.index };
  // Полный и «Очень кратко» — поля формы; разделы перечитывает свой список.
  const fields = fieldsOf([item]);
  const fieldsWritten = () => {
    if (fields.length > 0) onFieldsWritten(fields);
  };

  const run = async (action: () => Promise<unknown>, onError?: (e: unknown) => boolean) => {
    setBusy(true);
    setFailure(null);
    try {
      await action();
      return true;
    } catch (e) {
      if (!onError?.(e)) setFailure({ of: shape, error: e });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const accept = async (confirm: boolean) => {
    const ok = await run(
      () => actions.accept.mutateAsync(confirm ? { ...vars, confirmChapterChange: true } : vars),
      (e) => {
        const body = chapterChangeOf(e);
        if (body && !confirm) {
          setChapterChange(body);
          return true;
        }
        // Сервер мог записать (сеть, 5xx) или поле изменили: форма берёт его, правку не затирая.
        if (mayHaveWritten(e)) fieldsWritten();
        return false;
      }
    );
    if (!ok) return;
    onAccepted();
    fieldsWritten();
  };

  return (
    <article className={styles.item} aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`} className={styles.itemTitle}>
        {itemTitle(item)}
      </h4>
      <ItemCheck item={item} />
      <ItemStatus item={item} ready={ready} blockedBy={blockedBy} />
      {error !== null && <ItemError item={item} error={error} blockedBy={blockedBy} />}

      {ready && (
        <div className={styles.actions}>
          {isPending(item) && (
            <>
              <Button variant="primary" onClick={() => void accept(false)} disabled={locked}>
                Accept
              </Button>
              <Button
                variant="ghost"
                onClick={() => void run(() => actions.discardItem.mutateAsync(vars))}
                disabled={locked}
              >
                Discard
              </Button>
            </>
          )}
          {!item.regenerating && (
            <ItemRegenerate
              id={id}
              disabled={locked}
              busy={busy}
              onRegenerate={(remark) =>
                run(() => actions.regenerate.mutateAsync(remark ? { ...vars, remark } : vars))
              }
            />
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={chapterChange !== null}
        title={`Change the chapters of section ${chapterChange?.number ?? ''}`}
        message={chapterChange ? chapterChangeText(chapterChange) : ''}
        confirmLabel="Accept"
        onConfirm={() => {
          setChapterChange(null);
          void accept(true);
        }}
        onCancel={() => setChapterChange(null)}
      />
    </article>
  );
};
