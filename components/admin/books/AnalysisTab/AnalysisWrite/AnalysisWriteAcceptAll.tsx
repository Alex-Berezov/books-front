'use client';

import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import type { AnalysisAcceptAllSkipped, AnalysisWriteItem } from '@/types/api-schema';
import styles from './AnalysisWrite.module.scss';
import { refusalText, skippedText } from './analysisWrite.utils';

export interface AnalysisWriteAcceptAllProps {
  pending: boolean;
  /** Принимать нечего или ход не перечитывается. */
  disabled: boolean;
  /** Отказ последнего «Accept all» этого хода; `null` — не было. */
  error: unknown;
  /** Пункты, которые последний «Accept all» оставил предложениями, с причиной. */
  skipped: AnalysisAcceptAllSkipped[];
  /** Блоки хода из ответа «Accept all»: по ним называются пропущенные. */
  items: AnalysisWriteItem[];
  onAcceptAll: () => void;
}

/**
 * «Accept all» (F07 `product.md` §4-§5): все предложения по одному. Отказавший по себе пункт сервер
 * пропускает и называет в `skipped` (решение арбитра `F07 | F07-3`, п.7): вкладка показывает его
 * с причиной; полный список источников — с подсказкой, что делать.
 */
export const AnalysisWriteAcceptAll: FC<AnalysisWriteAcceptAllProps> = ({
  pending,
  disabled,
  error,
  skipped,
  items,
  onAcceptAll,
}) => (
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
    {error !== null && (
      <p className={styles.error} role="alert">
        {refusalText(error)}
      </p>
    )}
    {skipped.length > 0 && (
      <div role="status">
        <p className={styles.hint}>Left as proposals:</p>
        <ul className={styles.list} aria-label="Left as proposals">
          {skipped.map((s) => (
            <li key={s.index}>
              {skippedText(
                s,
                items.find((i) => i.index === s.index)
              )}
            </li>
          ))}
        </ul>
      </div>
    )}
  </>
);
