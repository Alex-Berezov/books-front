import { ApiError } from '@/types/api';
import type { ExpectedRow } from '@/types/api-schema';

/**
 * Что вкладка видела на сервере, когда сверяла форму (`LEGACY-496`). Только загруженный `null` —
 * «записи нет»; `undefined` — состояние неизвестно, признак не шлётся (L-013).
 */
export const expectedRowOf = (
  row: { updatedAt: string } | null | undefined
): ExpectedRow | undefined => {
  if (row === null) return { expectedAbsent: 'true' };
  return row ? { expectedUpdatedAt: row.updatedAt } : undefined;
};

/** Строка запроса сверки без `?`; пустая — сверять нечем. */
export const expectedRowParams = (expected?: ExpectedRow): string => {
  const params = new URLSearchParams();
  if (expected?.expectedAbsent) params.set('expectedAbsent', expected.expectedAbsent);
  if (expected?.expectedUpdatedAt) params.set('expectedUpdatedAt', expected.expectedUpdatedAt);
  return params.toString();
};

/** 409 ручной записи «запись изменили»; другие 409 (например, нет полного пересказа) — нет. */
export const isRecordChanged = (error: unknown): boolean =>
  error instanceof ApiError && error.statusCode === 409 && error.data?.code === 'RECORD_CHANGED';
