/**
 * Book Summaries Endpoints
 *
 * API endpoints for managing per-version book summaries
 * (краткий пересказ / выжимка).
 */

import { httpGetAuth, httpPostAuth, httpPutAuth } from '@/lib/http-client';
import type {
  BookSummaryDetail,
  BookSummarySectionAdmin,
  BookSummarySectionCreateResponse,
  BookSummarySectionList,
  BookSummarySectionUpdateResponse,
  CreateBookSummarySectionRequest,
  DeleteBookSummarySectionRequest,
  ReorderBookSummarySectionsRequest,
  UpdateBookSummarySectionRequest,
  UpsertBookSummaryBriefRequest,
  UpsertBookSummaryRequest,
} from '@/types/api-schema';

/**
 * Get book summary for a version.
 *
 * Returns `null` if no summary is stored yet: the server answers 200 with an empty body, the
 * client turns it into `undefined`, and for react-query 5 `undefined` from a query is a failure -
 * the Summary tab of a version without a summary did not open at all (20.10.2026).
 *
 * ⚠️ `optionalAuth`, а не `requireAuth: false`. Один и тот же адрес обслуживает
 * публичную страницу саммари и админскую вкладку, где редактор пишет текст **до**
 * публикации. С 10.08.2026 черновик отдаётся только по токену (`LEGACY-090`);
 * без него редактор увидел бы 404 на собственной незавершённой работе.
 *
 * @param versionId - Book version ID
 * @returns Summary data or null
 */
export const getBookSummary = async (versionId: string): Promise<BookSummaryDetail | null> => {
  const endpoint = `/versions/${versionId}/summary`;
  const summary = await httpGetAuth<BookSummaryDetail | null | undefined>(endpoint, {
    optionalAuth: true,
  });
  return summary ?? null;
};

/**
 * Upsert book summary for a version (create or update).
 *
 * @param versionId - Book version ID
 * @param data - Summary data to store
 * @returns Stored summary
 */
export const upsertBookSummary = async (
  versionId: string,
  data: UpsertBookSummaryRequest
): Promise<BookSummaryDetail> => {
  const endpoint = `/versions/${versionId}/summary`;
  return httpPutAuth<BookSummaryDetail>(endpoint, data);
};

/**
 * Очень краткий пересказ (F04): своя ручка, `PUT summary` его не знает. Без полного пересказа — 409.
 */
export const upsertBookSummaryBrief = async (
  versionId: string,
  data: UpsertBookSummaryBriefRequest
): Promise<BookSummaryDetail> =>
  httpPutAuth<BookSummaryDetail>(`/versions/${versionId}/summary/brief`, data);

/**
 * Разделы пересказа версии без текстов. Админке — все и без полного пересказа (по токену модератора).
 */
export const getBookSummarySections = async (versionId: string): Promise<BookSummarySectionList> =>
  httpGetAuth<BookSummarySectionList>(`/versions/${versionId}/summary-sections`);

/** Раздел с текстом по `id` — только модератору. */
export const getBookSummarySection = async (sectionId: string): Promise<BookSummarySectionAdmin> =>
  httpGetAuth<BookSummarySectionAdmin>(`/summary-sections/${sectionId}`);

/** Раздел в конец; номер ставит сервер. */
export const createBookSummarySection = async (
  versionId: string,
  data: CreateBookSummarySectionRequest
): Promise<BookSummarySectionCreateResponse> =>
  httpPostAuth<BookSummarySectionCreateResponse>(`/versions/${versionId}/summary-sections`, data);

/** Правка раздела по `id`; устаревший `expectedUpdatedAt` — 409, раздела нет — 404. */
export const updateBookSummarySection = async (
  sectionId: string,
  data: UpdateBookSummarySectionRequest
): Promise<BookSummarySectionUpdateResponse> =>
  httpPutAuth<BookSummarySectionUpdateResponse>(`/summary-sections/${sectionId}`, data);

/**
 * Удаление раздела со сдвигом следующих. `POST …/delete`, а не `DELETE`: `httpDelete` тела не несёт,
 * а сервер сверяет `from` с текущим порядком (409).
 */
export const deleteBookSummarySection = async (
  versionId: string,
  data: DeleteBookSummarySectionRequest
): Promise<BookSummarySectionList> =>
  httpPostAuth<BookSummarySectionList>(`/versions/${versionId}/summary-sections/delete`, data);

/** Перестановка разделов; устаревший `from` — 409. */
export const reorderBookSummarySections = async (
  versionId: string,
  data: ReorderBookSummarySectionsRequest
): Promise<BookSummarySectionList> =>
  httpPutAuth<BookSummarySectionList>(`/versions/${versionId}/summary-sections/order`, data);
