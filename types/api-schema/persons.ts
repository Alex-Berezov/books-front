/**
 * Участники (`Person`): сама сущность и тело ответа `GET /admin/persons` и `GET /admin/persons/search`.
 *
 * Конверт переехал из `api/endpoints/admin/persons.ts` 10.09.2026 - см. причину
 * в `types/api-schema/rating.ts`. Сущность переехала из `types/contributors` 26.09.2026
 * (`LEGACY-183`, пачка `T41`): слой 2 `check:type-sync` сверяет только имена бареля,
 * и `GET`/`POST`/`PATCH /admin/persons[/{id}]` до этого не проверялись вовсе.
 * `types/contributors` реэкспортирует эти имена, импортёры не менялись.
 */

import type { PaginatedResult } from './common';

export type PersonType = 'NATURAL_PERSON' | 'ORGANIZATION' | 'UNKNOWN';

export interface PersonTranslation {
  id: string;
  personId: string;
  language: string;
  slug: string;
  displayName: string;
  biography?: string | null;
  shortDescription?: string | null;
  wikidataUrl?: string | null;
  wikipediaUrl?: string | null;
  photoUrl?: string | null;
  // Перевод приходит связью без `select`, то есть строкой целиком; схема бэкенда называет
  // служебные поля с 14.09.2026 (`LEGACY-016`). Парная правка к
  // `books/src/modules/persons/dto/person-response.dto.ts`.
  seoId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  type: PersonType;
  canonicalName: string;
  sortName?: string | null;
  slug?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  nationalityCountryCode?: string | null;
  publicDomainFromYear?: number | null;
  wikidataId?: string | null;
  viafId?: string | null;
  isni?: string | null;
  gutenbergAgentId?: string | null;
  notesRu?: string | null;
  createdAt: string;
  updatedAt: string;
  translations?: PersonTranslation[];
}

/**
 * Единая обёртка `{items, pagination}` (`LEGACY-177`, 13.09.2026).
 *
 * ⚠️ `offset` из **ответа** ушёл: номер страницы сервер считает сам
 * (`books/src/modules/persons/persons.service.ts` — `Math.floor(offset / limit) + 1`).
 * Входной query-параметр `offset` не менялся и по-прежнему уходит в запросе.
 */
export type PersonListResponse = PaginatedResult<Person>;
