/**
 * Access token on the server (`LEGACY-140`, `LEGACY-198`).
 *
 * Браузерного геттера нет: в сессии `/api/auth/session` токена нет вовсе, запросы браузера ходят
 * через серверный прокси `/api/backend` (`LEGACY-465`). На сервере токен читается из JWT-куки
 * той же функцией, что у прокси (`readSessionAccessToken`, `lib/auth/session-token.ts`).
 *
 * Заготовка не подключена к `http*Auth` намеренно (см. `books-front/CLAUDE.md`, `LEGACY-198`):
 * серверный вызов, которому нужен токен, передаёт его полем `accessToken` явно.
 */

import { headers } from 'next/headers';
import { readSessionAccessToken } from '@/lib/auth/session-token';
import { getSiteUrl } from '@/lib/seo/urls';

/**
 * Get access token on server
 *
 * ⚠️ Только чтение куки, без продления (в отличие от прежнего `auth()`): access в куке может быть
 * просрочен — его продлевает `/api/auth/session` браузера. Серверный вызов получит 401 от API.
 *
 * @returns Access token or null — нет сессии или она окончена окончательно
 */
export const getServerAccessToken = async (): Promise<string | null> =>
  readSessionAccessToken(await headers(), new URL(getSiteUrl()));
