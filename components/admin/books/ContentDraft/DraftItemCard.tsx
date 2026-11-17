'use client';

import { useState, type ReactNode } from 'react';
import { isRegenPaused } from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { LlmOperation } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';
import { ItemRegenerate } from './ItemRegenerate';
import { ItemResume, type ItemResumeProps } from './ItemResume';

/**
 * Действие над текстом или блоком хода: занятость и отказ — к той судьбе пункта (`shape`), на которую
 * ответил сервер: новая судьба отказ снимает. `onError` разбирает отказ на месте (`true` — разобран,
 * в отказ не идёт). Одно правило у ходов пересказа, анализа и мира.
 */
export const useDraftItemAction = (shape: string) => {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ of: string; error: unknown } | null>(null);
  const act = async (action: () => Promise<unknown>, onError?: (e: unknown) => boolean) => {
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
  return { busy, error: failure?.of === shape ? failure.error : null, act };
};

/** Пункт хода, как его видит каркас: перегенерация и её пауза. */
export interface DraftCardItem {
  regenerating: boolean;
  regenOperationId: string | null;
  regenOperationStatus: LlmOperation['status'] | null;
  regenPauseReason: LlmOperation['pauseReason'];
}

export interface DraftItemCardProps {
  /** Префикс id: подпись карточки и поле замечания «Regenerate». */
  id: string;
  title: string;
  item: DraftCardItem;
  lang: SupportedLang;
  /** Ход готов: кнопки есть (иначе сервер ответит 409). */
  ready: boolean;
  /** Действия закрыты: идёт «Accept all» или ход не перечитывается. */
  disabled: boolean;
  /** Идёт действие этой карточки. */
  busy: boolean;
  /** Отметка проверки. */
  check?: ReactNode;
  /** Судьба пункта — до паузы перегенерации. */
  status: ReactNode;
  /** Содержимое и отказ — после паузы перегенерации. */
  body?: ReactNode;
  resume: ItemResumeProps['resume'];
  refusalText: (error: unknown) => string;
  /** Предложение: «Accept» и «Discard». */
  pending: boolean;
  /** «Accept» закрыт сверх общих причин (нет свежего содержимого). */
  acceptBlocked?: boolean;
  onAccept: () => void;
  onDiscard: () => void;
  /** «Regenerate»; `null` — у пункта его нет. */
  regenerate: {
    hint: string;
    onRegenerate: (remark: string | undefined) => Promise<boolean>;
  } | null;
  /** После кнопок: окна подтверждения своего хода. */
  children?: ReactNode;
}

/**
 * Каркас карточки текста или блока хода (F06 `product.md` §4-§5, F07 §4-§5, F08 §17 п.6) — один
 * на ходы пересказа, анализа и мира: заголовок, отметка, судьба, пауза перегенерации с «Continue»,
 * содержимое, «Accept» / «Discard» у предложения, «Regenerate» с замечанием. Своё у хода — слотами.
 */
export const DraftItemCard = ({
  id,
  title,
  item,
  lang,
  ready,
  disabled,
  busy,
  check,
  status,
  body,
  resume,
  refusalText,
  pending,
  acceptBlocked = false,
  onAccept,
  onDiscard,
  regenerate,
  children,
}: DraftItemCardProps) => {
  const locked = !ready || disabled || item.regenerating || busy;
  return (
    <article className={styles.item} aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`} className={styles.itemTitle}>
        {title}
      </h4>
      {check}
      {status}
      {isRegenPaused(item) && item.regenOperationId && (
        <ItemResume
          operationId={item.regenOperationId}
          pauseReason={item.regenPauseReason}
          lang={lang}
          disabled={!ready || disabled}
          resume={resume}
          refusalText={refusalText}
        />
      )}
      {body}

      {ready && (
        <div className={styles.actions}>
          {pending && (
            <>
              <Button variant="primary" onClick={onAccept} disabled={locked || acceptBlocked}>
                Accept
              </Button>
              <Button variant="ghost" onClick={onDiscard} disabled={locked}>
                Discard
              </Button>
            </>
          )}
          {regenerate && !item.regenerating && (
            <ItemRegenerate
              id={id}
              disabled={locked}
              busy={busy}
              hint={regenerate.hint}
              onRegenerate={regenerate.onRegenerate}
            />
          )}
        </div>
      )}
      {children}
    </article>
  );
};
