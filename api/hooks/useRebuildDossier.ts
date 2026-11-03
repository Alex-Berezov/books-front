/**
 * Перестройка досье версии с вкладки Analysis или Summary (F05-11, F06-3) — одна на обе вкладки.
 * Новое досье меняет оценки и ходы обеих: сбрасываются оценки и ходы заготовки Analysis и хода
 * «Write Summary» этой версии, само досье и его оценка.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { buildDossier } from '@/api/endpoints/admin/translation';
import type { ApiError } from '@/types/api';
import type { DossierStatus } from '@/types/api-schema';
import { CONTENT_DRAFT_LOCAL_CODES, contentDraftKeys, summaryWriteKeys } from './draftKeys';
import { dossierKeys } from './useDossier';

export const useRebuildDossier = (versionId: string) => {
  const queryClient = useQueryClient();
  return useMutation<DossierStatus, ApiError, void>({
    mutationFn: () => buildDossier(versionId),
    meta: CONTENT_DRAFT_LOCAL_CODES,
    // Отказ оценки `DOSSIER_STALE` лежит в кэше выключенного запроса: сброс, а не пометка
    // устаревшим, - иначе после перемонтирования вкладки «Rebuild dossier» вернулся бы.
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: contentDraftKeys.estimate(versionId, 'analysis') });
      queryClient.removeQueries({ queryKey: summaryWriteKeys.estimate(versionId) });
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: contentDraftKeys.latest(versionId, 'analysis') }),
        queryClient.invalidateQueries({ queryKey: summaryWriteKeys.latest(versionId) }),
        queryClient.invalidateQueries({ queryKey: dossierKeys.version(versionId) }),
        queryClient.invalidateQueries({ queryKey: dossierKeys.estimate(versionId) }),
      ]),
  });
};
