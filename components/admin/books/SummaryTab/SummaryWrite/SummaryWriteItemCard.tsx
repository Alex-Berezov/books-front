'use client';

import { useState, type FC } from 'react';
import {
  DraftItemCard,
  ItemCheck,
  useDraftItemAction,
} from '@/components/admin/books/ContentDraft';
import { ConfirmDialog } from '@/components/admin/shared';
import type { SummaryWriteActions } from '@/api/hooks';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SummaryChapterChangeBody, SummaryWriteItem } from '@/types/api-schema';
import { ItemError } from './ItemError';
import { ItemStatus } from './ItemStatus';
import {
  chapterChangeOf,
  chapterChangeText,
  fieldsOf,
  isPending,
  itemTitle,
  mayHaveWritten,
  refusalText,
  type SummaryWriteField,
} from './summaryWrite.utils';

export interface SummaryWriteItemCardProps {
  runId: string;
  lang: SupportedLang;
  item: SummaryWriteItem;
  /** Ход готов: тексты можно принимать, отбрасывать и перегенерировать (иначе сервер ответит 409). */
  ready: boolean;
  /** Действия закрыты: идёт «Accept all» или ход не перечитывается. */
  disabled: boolean;
  /** Раздел, которого ждёт раздел `waiting` (первый перед ним без текста). */
  blockedBy: number;
  actions: Pick<SummaryWriteActions, 'accept' | 'discardItem' | 'regenerate' | 'resume'>;
  /** Полный или «Очень кратко» мог измениться на сервере: форма берёт это поле. */
  onFieldsWritten: (fields: SummaryWriteField[]) => void;
  /** «Accept» или «Discard» этого текста лёг: прежний отказ «Accept all» больше не про этот ход. */
  onDecided: () => void;
}

/**
 * Текст хода «Write Summary» (F06 `product.md` §4-§5): отметка проверки, судьба текста,
 * предложение с «Accept» / «Discard», «Regenerate» с замечанием. 409 «Accept» разбирается
 * на месте: свежие данные поля, подтверждение смены глав раздела, раздел, которого ждёт ждущий.
 */
export const SummaryWriteItemCard: FC<SummaryWriteItemCardProps> = ({
  runId,
  lang,
  item,
  ready,
  disabled,
  blockedBy,
  actions,
  onFieldsWritten,
  onDecided,
}) => {
  // Отказ — к тому тексту, на который ответил: новый текст или его судьба отказ снимают.
  const { busy, error, act: run } = useDraftItemAction(`${item.outcome}|${item.html}`);
  const [chapterChange, setChapterChange] = useState<SummaryChapterChangeBody | null>(null);

  const id = `summary-write-item-${item.index}`;
  const vars = { id: runId, index: item.index };
  // Полный и «Очень кратко» — поля формы; разделы перечитывает свой список.
  const fields = fieldsOf([item]);
  const fieldsWritten = () => {
    if (fields.length > 0) onFieldsWritten(fields);
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
    onDecided();
    fieldsWritten();
  };

  const discard = async () => {
    if (await run(() => actions.discardItem.mutateAsync(vars))) onDecided();
  };

  return (
    <DraftItemCard
      id={id}
      title={itemTitle(item)}
      item={item}
      lang={lang}
      ready={ready}
      disabled={disabled}
      busy={busy}
      check={<ItemCheck verdict={item.verdict} remarks={item.remarks} review={item.review} />}
      status={
        <>
          <ItemStatus item={item} ready={ready} blockedBy={blockedBy} />
          {error !== null && <ItemError item={item} error={error} blockedBy={blockedBy} />}
        </>
      }
      resume={actions.resume}
      refusalText={refusalText}
      pending={isPending(item)}
      onAccept={() => void accept(false)}
      onDiscard={() => void discard()}
      regenerate={{
        hint: 'The result comes as a proposal unless the field is empty on an unpublished version.',
        onRegenerate: (remark) =>
          run(() => actions.regenerate.mutateAsync(remark ? { ...vars, remark } : vars)),
      }}
    >
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
    </DraftItemCard>
  );
};
