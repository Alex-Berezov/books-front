/**
 * Участники (`Person`): тело ответа `GET /admin/persons` и `GET /admin/persons/search`.
 *
 * Форма переехала из `api/endpoints/admin/persons.ts` 10.09.2026 - см. причину
 * в `types/api-schema/rating.ts`. Сам `Person` объявлен в `types/contributors`
 * и оттуда же импортируется: этот файл описывает только конверт ответа.
 */

import type { PaginatedResult } from './common';
import type { Person } from '../contributors';

/**
 * Единая обёртка `{items, pagination}` (`LEGACY-177`, 13.09.2026).
 *
 * ⚠️ `offset` из **ответа** ушёл: номер страницы сервер считает сам
 * (`books/src/modules/persons/persons.service.ts` — `Math.floor(offset / limit) + 1`).
 * Входной query-параметр `offset` не менялся и по-прежнему уходит в запросе.
 */
export type PersonListResponse = PaginatedResult<Person>;
