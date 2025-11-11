/**
 * NextAuth API Route Handler
 *
 * Handles all authentication requests through NextAuth:
 * - /api/auth/signin - sign in page
 * - /api/auth/signout - sign out
 * - /api/auth/session - get session
 * - /api/auth/callback/* - provider callbacks
 *
 * @see https://next-auth.js.org/configuration/initialization#route-handlers-app
 */

import { handlers } from '@/lib/auth/auth';

export const { GET, POST } = handlers;
