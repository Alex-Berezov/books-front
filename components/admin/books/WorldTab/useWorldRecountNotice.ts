import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bookWorldQueryKeys } from '@/api/hooks';
import type { BookWorldEntity } from '@/types/api-schema';
import { worldErrorText } from './worldErrors';

/** Метка карточки: `saved` — пересчёт поставила запись этой карточки, `queued` — чужая постановка. */
export type WorldRecountNotice = 'saved' | 'queued' | null;

/**
 * Метка «presence will update after the recount» (решения арбитра `F08 | F08-2` S5, S6): держит её
 * `editor.recountPending` карточки — у версии стоит строка очереди, кто бы её ни поставил (импорт
 * всей версии, правка главы). «Saved» — только после записи этой карточки (сохранение или импорт
 * JSON) с `recountQueued`: условие постановки (R4, S2, S7) здесь не повторяется. Когда строки
 * больше нет, метка забывает сохранение. Снимает Reload; `mentionsAt` не участвует — по Q4 он не
 * двигается, если присутствие не изменилось. Опроса нет; отказ Reload показывается.
 */
export const useWorldRecountNotice = (
  versionId: string,
  entity: BookWorldEntity | null,
  refetch: () => Promise<{ isError: boolean; error: unknown }>,
  /** Карточка открыта заново после своей первой записи, поставившей пересчёт (новая сущность). */
  queuedOnOpen = false
) => {
  const queryClient = useQueryClient();
  const [queued, setQueued] = useState(queuedOnOpen);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const serverPending = entity?.editor?.recountPending;

  useEffect(() => {
    if (queued && serverPending === false) setQueued(false);
  }, [queued, serverPending]);

  const notice: WorldRecountNotice = serverPending !== true ? null : queued ? 'saved' : 'queued';
  return {
    notice,
    reloadError,
    /**
     * Запись прошла: «Saved» — у записи, поставившей пересчёт. Следующая запись без постановки
     * признак не снимает: строка очереди та же; снимает его только уход строки.
     */
    onSaved: (recountQueued: boolean) => setQueued((q) => q || recountQueued),
    /** Перечитать карточку и строку списка (не форму): присутствие считает бэкенд. */
    reload: async () => {
      setReloadError(null);
      void queryClient.invalidateQueries({ queryKey: bookWorldQueryKeys.list(versionId) });
      const res = await refetch();
      if (res.isError) setReloadError(worldErrorText(res.error));
    },
  };
};
