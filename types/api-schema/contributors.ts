/**
 * Участники в админском каталоге и ответ привязки участника: `Contributor`, `ContributorListResponse`,
 * `ContributorLink`, `DeleteContributorResponse`.
 *
 * Переехали из `types/contributors` (`LEGACY-183`, пачка `T104`): слой 2 `check:type-sync` сверяет только
 * имена бареля, и `/admin/contributors[/{id}]`, привязка и отвязка участника до этого не проверялись вовсе.
 * Реэкспорта из `types/contributors` нет, как у контрибьютора версии (`T89`): потребители берут эти имена
 * из бареля `@/types/api-schema`.
 */

import type { ContributorRole } from './book-version-contributors';
import type { PaginatedResult } from './common';
import type { RightsConfidence } from './rights-intake';

/**
 * Участник в админском каталоге. Физически это запись `Person` —
 * отдельной таблицы `Contributor` в базе нет (см. фазу 14).
 */
export interface Contributor {
  id: string;
  displayName: string;
  sortName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  nationalityCountry?: string | null;
  publicDomainFromYear?: number | null;
  wikidataId?: string | null;
  viafId?: string | null;
  isni?: string | null;
  gutenbergAgentId?: string | null;
  notesRu?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ответ `GET /admin/contributors` — единая обёртка `{items, pagination}` (`LEGACY-177`,
 * 13.09.2026). До этого дня `total`, `page` и `limit` лежали рядом с `items`.
 */
export type ContributorListResponse = PaginatedResult<Contributor>;

/**
 * Ответ привязки и отвязки участника — `ContributorLinkResponseDto` бэкенда
 * (`contributors/dto/contributor-response.dto.ts`). Отдельный класс на бэкенде — отдельный тип
 * здесь: без `person`, а `sourceEvidenceIds` — сырая Json-колонка, путь привязки её не нормализует.
 */
export interface ContributorLink {
  id: string;
  rightsProfileId: string;
  rightsComponentId: string | null;
  personId: string | null;
  role: ContributorRole;
  roleOtherRu: string | null;
  displayName: string;
  canonicalName: string | null;
  creditedName: string | null;
  birthYear: number | null;
  deathYear: number | null;
  nationalityCountryCode: string | null;
  wikidataId: string | null;
  viafId: string | null;
  isni: string | null;
  gutenbergAgentId: string | null;
  creditedLanguage: string | null;
  publicDomainFromYear: number | null;
  sourceEvidenceIds: unknown;
  confidence: RightsConfidence | null;
  notesRu: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Ответ `DELETE /admin/contributors/{id}` — `DeleteContributorResponseDto` бэкенда: только `id` удалённой записи. */
export interface DeleteContributorResponse {
  id: string;
}
