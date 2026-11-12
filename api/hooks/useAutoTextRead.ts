/**
 * Отметка редактора «прочитано» вкладок Summary и Analysis (T184), только `admin`. Отметка,
 * её снятие и новый текст модели в полях меняют вердикт гейта публикации: после ответа — и при
 * отказе (409 значит, что на экране устаревшее состояние) — перечитываются отметка и гейт версии.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAutoTextRead,
  markAutoTextRead,
  unmarkAutoTextRead,
} from '@/api/endpoints/admin/auto-text-read';
import type { AutoTextRunKind } from '@/types/api-schema';
import { versionKeys } from './useBookVersions';

export const autoTextReadKeys = {
  all: ['auto-text-read'] as const,
  state: (versionId: string, kind: AutoTextRunKind) =>
    [...autoTextReadKeys.all, versionId, kind] as const,
};

export const useAutoTextRead = (versionId: string, kind: AutoTextRunKind) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: autoTextReadKeys.state(versionId, kind),
    queryFn: () => getAutoTextRead(versionId, kind),
  });
  /**
   * Ход записал текст модели (принятие, конец хода, перегенерация): сервер мог снять отметку сам —
   * перечитать её и вердикт гейта публикации на той же странице.
   */
  const refreshAfterRun = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: autoTextReadKeys.state(versionId, kind) }),
        queryClient.invalidateQueries({ queryKey: versionKeys.publicationGate(versionId) }),
      ]),
    [queryClient, versionId, kind]
  );
  const mark = useMutation({
    mutationFn: (autoTextAt: string) => markAutoTextRead(versionId, kind, { autoTextAt }),
    onSettled: refreshAfterRun,
  });
  const unmark = useMutation({
    mutationFn: () => unmarkAutoTextRead(versionId, kind),
    onSettled: refreshAfterRun,
  });
  return { query, mark, unmark, refreshAfterRun };
};
