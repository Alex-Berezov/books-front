/** Итог перечитывания: ответ и признак, что он пришёл после начала запроса. */
export interface FreshRefetch<R> {
  result: R;
  fresh: boolean;
}

export interface RefetchFreshOptions {
  /**
   * Проверка после каждой попытки: вкладка ещё на той версии, ради которой перечитывали.
   * Вернула `false` — итог `null`, ответ не про эту версию. Нет — проверяет вызывающий сам.
   */
  stillCurrent?: () => boolean;
  /** Повторять и отказ сервера, а не только отменённый запрос (так перечитывает анализ). */
  retryFailure?: boolean;
}

/**
 * Перечитывание, которому можно верить (`T174`, `T179`). Запрос, отменённый соседним
 * перечитыванием или сохранением (`cancelQueries`), отдаёт прежние данные со статусом `success`:
 * свежий только ответ, у которого `dataUpdatedAt` не раньше начала. Устаревший ответ — ещё одна
 * попытка (отказ — только с `retryFailure`); не вышло — `fresh: false`.
 */
export const refetchFresh = async <R extends { status: string; dataUpdatedAt: number }>(
  refetch: () => Promise<R>,
  { stillCurrent, retryFailure = false }: RefetchFreshOptions = {}
): Promise<FreshRefetch<R> | null> => {
  const attempt = async (): Promise<FreshRefetch<R> | null> => {
    const startedAt = Date.now();
    const result = await refetch();
    if (stillCurrent && !stillCurrent()) return null;
    return { result, fresh: result.status === 'success' && result.dataUpdatedAt >= startedAt };
  };
  const first = await attempt();
  if (!first || first.fresh) return first;
  // Отказ сервера повторяется только с `retryFailure`; отменённый запрос (успех со старыми данными) — всегда.
  if (first.result.status !== 'success' && !retryFailure) return first;
  return attempt();
};
