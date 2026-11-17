'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from './ContentDraft.module.scss';

interface Skipped {
  index: number;
}

export interface AcceptAllOutcomeProps<S extends Skipped, I extends Skipped> {
  error: unknown;
  skipped: S[];
  /** Блоки хода из ответа «Accept all»: по ним называются пропущенные. */
  items: I[];
  /** Ход готов и у пунктов есть кнопки: подсказки «что нажать» даются. */
  actionable: boolean;
  /** Отказ словами — по таблице своего хода. */
  refusalText: (error: unknown) => string;
  /** Строка пропущенного пункта — правило своего хода. */
  skippedText: (skipped: S, item: I | undefined, actionable: boolean) => string;
}

/**
 * Итог «Accept all» хода анализа или мира: отказ и пункты, оставшиеся предложениями, с причиной.
 * `actionable: false` — ход больше не готов, кнопок у пунктов нет: подсказок не даём (T174, п.1).
 */
export const AcceptAllOutcome = <S extends Skipped, I extends Skipped>({
  error,
  skipped,
  items,
  actionable,
  refusalText,
  skippedText,
}: AcceptAllOutcomeProps<S, I>) => {
  // Обрыв чаще всего значит чужой новый ход: предложений прежнего уже нет.
  const title = actionable ? 'Left as proposals' : 'Skipped before the stop';
  return (
    <>
      {error !== null && (
        <p className={styles.error} role="alert">
          {refusalText(error)}
        </p>
      )}
      {skipped.length > 0 && (
        <div role="status">
          <p className={styles.hint}>{title}:</p>
          <ul className={styles.list} aria-label={title}>
            {skipped.map((s) => (
              <li key={s.index}>
                {skippedText(
                  s,
                  items.find((i) => i.index === s.index),
                  actionable
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export interface AcceptAllProps<S extends Skipped, I extends Skipped> extends Omit<
  AcceptAllOutcomeProps<S, I>,
  'actionable'
> {
  pending: boolean;
  /** Принимать нечего, ход не перечитывается или идёт запись формы. */
  disabled: boolean;
  onAcceptAll: () => void;
}

/**
 * «Accept all» (F07 `product.md` §4-§5, F08 §17 п.6): все предложения по одному. Отказавший по себе
 * пункт сервер пропускает и называет в `skipped`: панель показывает его с причиной.
 */
export const AcceptAll = <S extends Skipped, I extends Skipped>({
  pending,
  disabled,
  onAcceptAll,
  ...outcome
}: AcceptAllProps<S, I>): ReactNode => (
  <>
    <div className={styles.actions}>
      <Button
        variant="primary"
        onClick={onAcceptAll}
        loading={pending}
        disabled={pending || disabled}
      >
        Accept all
      </Button>
    </div>
    <AcceptAllOutcome {...outcome} actionable />
  </>
);
