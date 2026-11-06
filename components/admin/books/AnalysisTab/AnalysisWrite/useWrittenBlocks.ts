import { useEffect, useRef } from 'react';
import type { AnalysisWrite } from '@/types/api-schema';

/**
 * Прямые записи хода (пустые блоки неопубликованной версии) приходят опросом: новый блок
 * в `written` — форма анализа и ядро перечитываются.
 *
 * Первый ответ хода на версии с записанными блоками — тоже: форма могла заполниться из кэша
 * анализа раньше записи хода, и «Save analysis» вернул бы прежнее (несохранённую правку
 * перечитывание не затирает). Новый ход (другой `id`) на открытой вкладке — его записи новые.
 * Кончилась перегенерация пункта — тоже: блок, который редактор очистил и сохранил, перегенерация
 * пишет в анализ сразу под тем же номером, и `written` у пункта не меняется (промежуточное
 * ожидание опрос не застаёт). Заполненный блок она меняет предложением — перечитывание лишнее,
 * но безвредное.
 */
export const useWrittenBlocks = (
  versionId: string,
  run: AnalysisWrite | null | undefined,
  onBlocksWritten: () => void
): void => {
  const seen = useRef<{ runId: string; written: Set<number>; regen: Set<number> } | null>(null);
  // Версия, у которой первый ответ хода уже разобран.
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (run === undefined) return;
    if (loadedFor.current !== versionId) seen.current = null;
    loadedFor.current = versionId;
    if (run === null) return;
    const written = run.items.filter((i) => i.outcome === 'written').map((i) => i.index);
    const regen = run.items.filter((i) => i.regenerating).map((i) => i.index);
    const before = seen.current?.runId === run.id ? seen.current : null;
    seen.current = { runId: run.id, written: new Set(written), regen: new Set(regen) };
    const fresh = before ? written.filter((i) => !before.written.has(i)) : written;
    const regenEnded = before ? [...before.regen].filter((i) => !regen.includes(i)) : [];
    if (fresh.length > 0 || regenEnded.length > 0) onBlocksWritten();
  }, [versionId, run, onBlocksWritten]);
};
