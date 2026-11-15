/**
 * Book World Endpoints (F08-1)
 *
 * «Мир книги» of a book version: entities (characters in F08-1), the read mark and the flags.
 */

import { expectedRowParams } from '@/lib/admin/expected-row';
import {
  httpDeleteAuth,
  httpGetAuth,
  httpPatchAuth,
  httpPostAuth,
  httpPutAuth,
} from '@/lib/http-client';
import type {
  BookWorldEntityResponse,
  BookWorldEntitySaveResponse,
  BookWorldEntitySummary,
  BookWorldExpected,
  BookWorldListResponse,
  BookWorldSaveResponse,
  ExpectedRow,
  MarkBookWorldReadRequest,
  SaveBookWorldEntityRequest,
  SaveBookWorldRequest,
  SetBookWorldFlagsRequest,
} from '@/types/api-schema';

/**
 * Список для вкладки админки — с обязательной авторизацией, без `optionalAuth`: аноним получает
 * только публичные сущности без `editor`, и вкладка показала бы неполный мир как весь.
 * Публичной странице (F08-3) нужна своя функция чтения.
 */
export const getBookWorld = async (versionId: string): Promise<BookWorldListResponse> =>
  httpGetAuth<BookWorldListResponse>(`/versions/${encodeURIComponent(versionId)}/world`);

export const getBookWorldEntity = async (
  versionId: string,
  key: string
): Promise<BookWorldEntityResponse> =>
  httpGetAuth<BookWorldEntityResponse>(
    `/versions/${encodeURIComponent(versionId)}/world/${encodeURIComponent(key)}`
  );

/**
 * Import the world of the whole version (merge on the server: entities outside the body stay).
 * `dryRun` checks and merges exactly as a save and writes nothing. `expected` — what the tab saw:
 * the newest `updatedAt` and the number of the version entities, or «no entities» (decision
 * `F08 | F08-1` R6).
 */
export const saveBookWorld = async (
  versionId: string,
  data: SaveBookWorldRequest,
  dryRun = false,
  expected?: BookWorldExpected
): Promise<BookWorldSaveResponse> => {
  const count =
    expected?.expectedCount === undefined ? '' : `expectedCount=${expected.expectedCount}`;
  const params = dryRun
    ? 'dryRun=true'
    : [expectedRowParams(expected), count].filter(Boolean).join('&');
  const endpoint = `/versions/${encodeURIComponent(versionId)}/world${params ? `?${params}` : ''}`;
  return httpPutAuth<BookWorldSaveResponse>(endpoint, data);
};

/**
 * Save (merge) one entity; `dryRun` checks and merges exactly as a save and writes nothing.
 * `expected` — the entity the card saw or «absent» for a new one; a dry run sends no check.
 */
export const saveBookWorldEntity = async (
  versionId: string,
  key: string,
  data: SaveBookWorldEntityRequest,
  dryRun = false,
  expected?: ExpectedRow
): Promise<BookWorldEntitySaveResponse> => {
  const params = dryRun ? 'dryRun=true' : expectedRowParams(expected);
  const endpoint = `/versions/${encodeURIComponent(versionId)}/world/${encodeURIComponent(key)}${params ? `?${params}` : ''}`;
  return httpPutAuth<BookWorldEntitySaveResponse>(endpoint, data);
};

/** 204. 409 `WORLD_ENTITY_PUBLISHED` (was or is public), 409 `WORLD_ENTITY_REFERENCED`. */
export const deleteBookWorldEntity = async (versionId: string, key: string): Promise<void> =>
  httpDeleteAuth<void>(
    `/versions/${encodeURIComponent(versionId)}/world/${encodeURIComponent(key)}`
  );

/**
 * «Read» mark — `admin` only. 409 `AUTO_TEXT_NONE` (no model text), 409 `WORLD_TEXT_CHANGED`
 * (model text changed after the tab showed it).
 */
export const markBookWorldEntityRead = async (
  versionId: string,
  key: string,
  data: MarkBookWorldReadRequest
): Promise<BookWorldEntitySummary> =>
  httpPostAuth<BookWorldEntitySummary>(
    `/versions/${encodeURIComponent(versionId)}/world/${encodeURIComponent(key)}/read`,
    data
  );

export const setBookWorldEntityFlags = async (
  versionId: string,
  key: string,
  data: SetBookWorldFlagsRequest
): Promise<BookWorldEntitySummary> =>
  httpPatchAuth<BookWorldEntitySummary>(
    `/versions/${encodeURIComponent(versionId)}/world/${encodeURIComponent(key)}/flags`,
    data
  );
