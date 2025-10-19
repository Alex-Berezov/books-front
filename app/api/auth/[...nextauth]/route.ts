/**
 * NextAuth API Route Handler
 *
 * Обрабатывает все запросы авторизации через NextAuth:
 * - /api/auth/signin - страница входа
 * - /api/auth/signout - выход
 * - /api/auth/session - получение сессии
 * - /api/auth/callback/* - callbacks провайдеров
 *
 * @see https://next-auth.js.org/configuration/initialization#route-handlers-app
 */

import { handlers } from '@/lib/auth/auth';

export const { GET, POST } = handlers;
