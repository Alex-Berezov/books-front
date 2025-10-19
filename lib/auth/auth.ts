/**
 * NextAuth v5 Auth instance
 *
 * Предоставляет функции для работы с авторизацией:
 * - auth() - получение сессии на сервере
 * - signIn() - вход пользователя
 * - signOut() - выход пользователя
 *
 * @see https://authjs.dev/getting-started/installation
 */

import NextAuth from 'next-auth';
import { authOptions } from './config';

export const { auth, signIn, signOut, handlers } = NextAuth(authOptions);
