/**
 * Book Analysis Endpoints (F03-1)
 *
 * Analysis («Разбор и анализ») of a book version and chapter titles for the prompt inputs.
 */

import { httpGetAuth, httpPutAuth } from '@/lib/http-client';
import type {
  BookAnalysisDetail,
  BookAnalysisSaveResponse,
  ChapterTitle,
  PaginatedResult,
  SaveBookAnalysisRequest,
} from '@/types/api-schema';

/**
 * Чтение для вкладки админки — с обязательной авторизацией, без `optionalAuth`: при сбое сессии
 * запрос ушёл бы анонимно, аноним получает `null` за анализ без ядра, и пустая форма, сохранённая
 * целиком (А4), стёрла бы живой черновик. Без сессии — 401 и ошибка чтения во вкладке.
 * Публичной странице (F03-2) нужна своя функция чтения.
 */
export const getBookAnalysis = async (versionId: string): Promise<BookAnalysisDetail | null> => {
  const endpoint = `/versions/${versionId}/analysis`;
  // Нет анализа — бэкенд отвечает `null`, это 200 с пустым телом, а `lib/http.ts` превращает
  // пустое тело в `undefined`. `undefined` из `queryFn` react-query 5 считает ошибкой (как `getProgress`).
  const analysis = await httpGetAuth<BookAnalysisDetail | null | undefined>(endpoint);
  return analysis ?? null;
};

/**
 * Save (merge) analysis for a version. `dryRun` validates and merges exactly as a save would
 * and writes nothing: the import window shows `hasCore` and `warnings` before applying (decision A3).
 */
export const saveBookAnalysis = async (
  versionId: string,
  data: SaveBookAnalysisRequest,
  dryRun = false
): Promise<BookAnalysisSaveResponse> => {
  const endpoint = `/versions/${versionId}/analysis${dryRun ? '?dryRun=true' : ''}`;
  return httpPutAuth<BookAnalysisSaveResponse>(endpoint, data);
};

/** Chapter numbers and titles without text — «Вводные для промпта» (decision A5). */
export const getChapterTitles = async (
  versionId: string
): Promise<PaginatedResult<ChapterTitle>> => {
  const endpoint = `/admin/versions/${versionId}/chapter-titles`;
  return httpGetAuth<PaginatedResult<ChapterTitle>>(endpoint);
};
