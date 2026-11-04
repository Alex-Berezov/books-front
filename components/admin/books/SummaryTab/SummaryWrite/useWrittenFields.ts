import { useEffect, useRef } from 'react';
import type { SummaryWrite } from '@/types/api-schema';
import { fieldsOf, type SummaryWriteField } from './summaryWrite.utils';

/**
 * Прямые записи хода (пустые поля неопубликованной версии) приходят опросом: новый текст
 * в `written` — разделы версии перечитываются, полный и «Очень кратко» уходят в форму.
 *
 * Первый ответ хода на версии: записанные ходом разделы перечитываются (список мог не знать о них), а записанные полный и «Очень кратко»
 * уходят в форму — она могла заполниться из кэша пересказа раньше записи хода, и Save вернул бы
 * в поле прежний текст (несохранённую правку форма не затирает). Новый ход (другой `id`) на открытой
 * вкладке — его записанные тексты новые. Смена версии — снова первый ответ.
 */
export const useWrittenFields = (
  versionId: string,
  run: SummaryWrite | null | undefined,
  refreshFields: () => Promise<unknown>,
  onFieldsWritten: (fields: SummaryWriteField[]) => void
): void => {
  // Запись помнится вместе с отпечатком текста: перегенерация с прямой записью оставляет тот же номер.
  const seen = useRef<{ runId: string; written: Map<number, string> } | null>(null);
  // Версия, у которой первый ответ хода уже разобран.
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (run === undefined) return;
    const first = loadedFor.current !== versionId;
    if (first) seen.current = null;
    loadedFor.current = versionId;
    if (run === null) return;
    const written = run.items.filter((i) => i.outcome === 'written');
    const before = seen.current;
    seen.current = { runId: run.id, written: new Map(written.map((i) => [i.index, i.html])) };
    if (first) {
      const fields = fieldsOf(written);
      if (fields.length > 0) onFieldsWritten(fields);
      // Разделы, записанные ходом до первого ответа, в списке разделов могли не появиться.
      if (written.some((i) => i.target === 'section')) void refreshFields();
      return;
    }
    const fresh =
      before?.runId === run.id
        ? written.filter((i) => before.written.get(i.index) !== i.html)
        : written;
    if (fresh.length === 0) return;
    const fields = fieldsOf(fresh);
    void refreshFields().then(() => {
      if (fields.length > 0) onFieldsWritten(fields);
    });
  }, [versionId, run, refreshFields, onFieldsWritten]);
};
