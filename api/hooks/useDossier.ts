/**
 * React Query hooks for the book dossier and the language glossaries (F05-2, F05-7v, `admin`
 * only) — в F05-7v только чтение; построение досье (F05-10) сбрасывает те же ключи.
 */

import { useQuery } from '@tanstack/react-query';
import { getDossierGlossary, getVersionDossier } from '@/api/endpoints/admin/translation';

export const dossierKeys = {
  all: ['dossier'] as const,
  version: (versionId: string) => [...dossierKeys.all, 'version', versionId] as const,
  glossary: (dossierId: string, language: string) =>
    [...dossierKeys.all, 'glossary', dossierId, language] as const,
};

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
  });

/** Глоссарий языка у досье; без досье или без построенного глоссария — запроса нет (404). */
export const useDossierGlossary = (dossierId: string | null, language: string, enabled: boolean) =>
  useQuery({
    queryKey: dossierKeys.glossary(dossierId ?? '', language),
    queryFn: () => getDossierGlossary(dossierId as string, language),
    enabled: enabled && dossierId !== null,
  });
