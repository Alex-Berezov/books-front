import type { ReactNode } from 'react';
import type { DataIssue } from '@/lib/admin/data-issue';

/** Ошибка данных JSON: путь поля (`themes.0.title`) и текст причины. */
export type JsonImportIssue = DataIssue;

/** Разбор текста JSON: данные для пробы или ошибки формы по пути. */
export interface JsonImportAnalysis<T> {
  data: T | null;
  errors: JsonImportIssue[];
}

/**
 * Итог пробы на сервере. `ok` — своя форма у каждого окна; `rejected` — сервер отверг данные
 * (4xx проверки) — строки как есть; `failed` — проверить не удалось (сеть, 5xx).
 */
export type JsonImportPreview<Ok extends { state: 'ok' }> =
  | { state: 'checking' }
  | Ok
  | { state: 'rejected'; message: string }
  | { state: 'failed'; message: string };

/** Итог подтверждения: `ok: false` — окно остаётся открытым и показывает причину. */
export type JsonImportResult = { ok: true } | { ok: false; message: string };

export interface JsonImportPreviewModalProps<
  A extends JsonImportAnalysis<unknown>,
  Ok extends { state: 'ok' },
> {
  isOpen: boolean;
  onCancel: () => void;
  title: string;
  confirmText: string;
  /** Пояснение над полем: что делает импорт. */
  hint: ReactNode;
  placeholder: string;
  /** Разбор JSON; `null` — модуль проверки ещё грузится. */
  analyze: ((jsonText: string) => A) | null;
  loadFailed: boolean;
  onRetryLoad: () => void;
  /**
   * Что ещё, кроме текста JSON, решает итог пробы: при смене значения (сравнение `Object.is`)
   * проба перезапускается. Analysis передаёт форму — проба сливает JSON с ней; World не
   * передаёт — проба только от текста.
   */
  previewKey?: unknown;
  /** Проба на сервере (`dryRun`) после паузы в наборе. */
  preview: (data: NonNullable<A['data']>) => Promise<JsonImportPreview<Ok>>;
  /** Удачная проба. */
  renderOk: (result: Ok) => ReactNode;
  /** Сверх ошибок формы — что ещё сказать о разборе (например, какие блоки очистятся). */
  renderAnalysis?: (analysis: A) => ReactNode;
  /**
   * Подтверждение после удачной пробы. Без промиса — окно закрывается сразу; промис с
   * `ok: false` оставляет окно открытым с причиной.
   */
  onConfirm: (data: NonNullable<A['data']>) => void | Promise<JsonImportResult>;
}
