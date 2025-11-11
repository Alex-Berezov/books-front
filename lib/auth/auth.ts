/**
 * NextAuth v5 Auth instance
 *
 * Provides functions for working with authorization:
 * - auth() - get session on server
 * - signIn() - user login
 * - signOut() - user logout
 *
 * @see https://authjs.dev/getting-started/installation
 */

import NextAuth from 'next-auth';
import { authOptions } from './config';

export const { auth, signIn, signOut, handlers } = NextAuth(authOptions);
