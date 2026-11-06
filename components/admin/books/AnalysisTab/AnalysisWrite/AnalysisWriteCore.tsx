'use client';

import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import type { BookAnalysisWarning } from '@/types/api-schema';
import styles from './AnalysisWrite.module.scss';

/** Ядро сохранённого анализа — так, как его знает вкладка (одно состояние на вкладку). */
export interface AnalysisCoreState {
  /** Живой `hasCore` сохранённого анализа (`GET versions/:id/analysis`); `null` — не загружен. */
  hasCore: boolean | null;
  /**
   * Чего не хватает — предупреждения `core_incomplete` сервера (сохранение или проба сохранённой
   * записи); `null` — проба ещё идёт или не удалась.
   */
  missing: BookAnalysisWarning[] | null;
  /** Проба сохранённой записи не удалась: причина. */
  error: string | null;
  retry: () => void;
}

/**
 * Плашка ядра (F07 `product.md` §5): «Core: ready» по живому `hasCore` сохранённого анализа или
 * перечень недостающего — тем, что считает сервер (фронт ядро не считает,
 * `books/src/modules/book-analysis/book-analysis-core.ts`). Флаг шага `CORE_MISSING` сюда не идёт —
 * он про момент шага, а ядро меняют и «Accept», и ручное сохранение (решение арбитра `F07 | F07-3`, п.6).
 */
export const AnalysisWriteCore: FC<{ core: AnalysisCoreState }> = ({ core }) => {
  if (core.hasCore === null) return null;
  if (core.hasCore) {
    return (
      <p className={`${styles.core} ${styles.coreReady}`} role="status">
        Core: ready
      </p>
    );
  }
  return (
    <div className={styles.core} role="status">
      {core.missing !== null ? (
        <>
          <span>Core: not ready{core.missing.length > 0 ? ' — missing:' : '.'}</span>
          {core.missing.length > 0 && (
            <ul className={styles.list}>
              {core.missing.map((w) => (
                <li key={w.path}>{w.message}</li>
              ))}
            </ul>
          )}
        </>
      ) : core.error !== null ? (
        <span className={styles.error}>
          Core: not ready. Could not check what is missing: {core.error}{' '}
          <Button type="button" variant="link" onClick={core.retry}>
            Retry
          </Button>
        </span>
      ) : (
        <span>Core: not ready — checking what is missing…</span>
      )}
    </div>
  );
};
