/**
 * React Query hooks for book analysis (F03-1).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBookAnalysis,
  getChapterTitles,
  saveBookAnalysis,
} from '@/api/endpoints/admin/bookAnalyses';
import type { BookAnalysisSaveResponse, SaveBookAnalysisRequest } from '@/types/api-schema';

export const analysisKeys = {
  all: ['analyses'] as const,
  detail: (versionId: string) => [...analysisKeys.all, 'detail', versionId] as const,
  chapterTitles: (versionId: string) => [...analysisKeys.all, 'chapter-titles', versionId] as const,
};

export const useBookAnalysis = (versionId: string) =>
  useQuery({
    queryKey: analysisKeys.detail(versionId),
    queryFn: () => getBookAnalysis(versionId),
    staleTime: 30 * 1000,
  });

export const useChapterTitles = (versionId: string) =>
  useQuery({
    queryKey: analysisKeys.chapterTitles(versionId),
    queryFn: () => getChapterTitles(versionId),
    staleTime: 30 * 1000,
  });

/** Сохранение анализа; `dryRun` ничего не пишет и кэш не сбрасывает. */
export const useSaveBookAnalysis = () => {
  const queryClient = useQueryClient();
  return useMutation<
    BookAnalysisSaveResponse,
    Error,
    { versionId: string; data: SaveBookAnalysisRequest; dryRun?: boolean }
  >({
    mutationFn: ({ versionId, data, dryRun }) => saveBookAnalysis(versionId, data, dryRun),
    onSuccess: (data, variables) => {
      if (variables.dryRun) return;
      // Сохранённая запись кладётся в кэш сразу: вкладка, смонтированная заново до перечитывания,
      // иначе заполнила бы форму старыми данными, и следующее сохранение (вся запись, А4) их вернуло бы.
      if (data.analysis) {
        queryClient.setQueryData(analysisKeys.detail(variables.versionId), data.analysis);
      }
      void queryClient.invalidateQueries({ queryKey: analysisKeys.detail(variables.versionId) });
    },
  });
};
