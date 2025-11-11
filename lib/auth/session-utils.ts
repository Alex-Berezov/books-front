/**
 * Utilities for working with NextAuth session in HTTP requests
 *
 * Provides functions for getting authorization tokens
 * both on client and server.
 */

import { getSession } from 'next-auth/react';
import { auth } from '@/lib/auth/auth';

/**
 * Get access token on client
 *
 * @returns Access token or null
 */
export const getClientAccessToken = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.accessToken || null;
};

/**
 * Get access token on server
 *
 * @returns Access token or null
 */
export const getServerAccessToken = async (): Promise<string | null> => {
  const session = await auth();
  return session?.accessToken || null;
};

/**
 * Get access token (universal function)
 *
 * Automatically detects context (client/server)
 *
 * @returns Access token or null
 */
export const getAccessToken = async (): Promise<string | null> => {
  // Check if we are in browser
  if (typeof window !== 'undefined') {
    return getClientAccessToken();
  }

  // Server context
  return getServerAccessToken();
};
