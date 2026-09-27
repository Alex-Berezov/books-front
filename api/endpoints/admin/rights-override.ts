/**
 * Решение администратора «Разрешить публикацию» по книге (последняя инстанция, 27.09.2026).
 *
 * Чтение доступно `admin` и `content_manager`, выдача и отмена — только `admin` (403 остальным).
 * Повторная выдача при активном решении не ошибка: бэкенд сам отменяет прежнее и заводит новое.
 */

import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  GrantRightsOverrideRequest,
  RevokeRightsOverrideRequest,
  RightsPublicationOverride,
  RightsPublicationOverrideState,
} from '@/types/api-schema';

export const getRightsOverride = async (bookId: string): Promise<RightsPublicationOverrideState> =>
  httpGetAuth<RightsPublicationOverrideState>(`/admin/books/${bookId}/rights-override`);

export const grantRightsOverride = async (
  bookId: string,
  data: GrantRightsOverrideRequest
): Promise<RightsPublicationOverride> =>
  httpPostAuth<RightsPublicationOverride>(`/admin/books/${bookId}/rights-override`, data);

/** 409 с `code: 'RIGHTS_OVERRIDE_NOT_ACTIVE'`, если активного решения уже нет. */
export const revokeRightsOverride = async (
  bookId: string,
  data: RevokeRightsOverrideRequest
): Promise<RightsPublicationOverride> =>
  httpPostAuth<RightsPublicationOverride>(`/admin/books/${bookId}/rights-override/revoke`, data);
