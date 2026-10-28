/**
 * React Query hooks for the book dossier and the language glossaries (F05-2, F05-7v, `admin`
 * only); оценка перестройки досье — вкладка Summary при `DOSSIER_STALE` (F05-10).
 */

import { useQuery } from '@tanstack/react-query';
import { LLM_MODELS_UNAVAILABLE } from '@/api/endpoints/admin/llm';
import {
  getDossierEstimate,
  getDossierGlossary,
  getVersionDossier,
} from '@/api/endpoints/admin/translation';
import { localErrorCodes } from '@/lib/api/local-error-codes';
import type { DossierStatus } from '@/types/api-schema';

export const dossierKeys = {
  all: ['dossier'] as const,
  version: (versionId: string) => [...dossierKeys.all, 'version', versionId] as const,
  estimate: (versionId: string) => [...dossierKeys.all, 'estimate', versionId] as const,
  glossary: (dossierId: string, language: string) =>
    [...dossierKeys.all, 'glossary', dossierId, language] as const,
};

/** Шаг опроса досье, пока оно строится: ход кусков и групп сводки в подписи живой (F05-12). */
export const DOSSIER_REFETCH_MS = 4_000;

/** Опрашивать, только пока досье строится и последний запрос не упал. */
export const dossierRefetchInterval = (
  dossier: DossierStatus | undefined,
  failed = false
): number | false => (!failed && dossier?.status === 'building' ? DOSSIER_REFETCH_MS : false);

/**
 * Досье версии: у черновика перевода — досье его запуска, у исходника — действующее поколение
 * (`books/src/modules/translation/dossier/dossier.service.ts`, `status`); экран кусков сверяет
 * `id` с досье запуска (решение арбитра `F05 | F05-7v-b`).
 */
export const useVersionDossier = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: dossierKeys.version(versionId),
    queryFn: () => getVersionDossier(versionId),
    enabled,
    refetchInterval: (query) =>
      dossierRefetchInterval(query.state.data, query.state.status === 'error'),
  });

/** Глоссарий языка у досье; без досье или без построенного глоссария — запроса нет (404). */
export const useDossierGlossary = (dossierId: string | null, language: string, enabled: boolean) =>
  useQuery({
    queryKey: dossierKeys.glossary(dossierId ?? '', language),
    queryFn: () => getDossierGlossary(dossierId as string, language),
    enabled: enabled && dossierId !== null,
  });

/** Оценка перестройки устаревшего досье: запрос уходит, только когда окно подтверждения открыто. */
export const useDossierEstimate = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: dossierKeys.estimate(versionId),
    queryFn: () => getDossierEstimate(versionId),
    enabled,
    retry: false,
    staleTime: 0,
    meta: localErrorCodes(['LLM_DISABLED', LLM_MODELS_UNAVAILABLE]),
  });
