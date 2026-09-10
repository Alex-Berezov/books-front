/**
 * Участники (`Person`): тело ответа `GET /admin/persons` и `GET /admin/persons/search`.
 *
 * Форма переехала из `api/endpoints/admin/persons.ts` 10.09.2026 - см. причину
 * в `types/api-schema/rating.ts`. Сам `Person` объявлен в `types/contributors`
 * и оттуда же импортируется: этот файл описывает только конверт ответа.
 */

import type { Person } from '../contributors';

export interface PersonListResponse {
  items: Person[];
  total: number;
  limit: number;
  offset: number;
}
