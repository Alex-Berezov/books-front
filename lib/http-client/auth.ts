/**
 * Authorization module for HTTP client
 *
 * Handles token retrieval and authorization error processing
 */

import { getSession, signOut } from 'next-auth/react';
import { ApiError } from '@/types/api';

/**
 * Get current session and access token
 *
 * @returns User session or null
 */
export const getCurrentSession = async () => {
  // Client-side only
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const session = await getSession();
    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

/**
 * Get access token from current session
 *
 * @param requireAuth - Whether authorization is required
 * @param providedToken - Token explicitly provided
 * @returns Access token or null
 * @throws ApiError if requireAuth = true and no token available
 */
export const getAccessToken = async (
  requireAuth: boolean,
  providedToken?: string
): Promise<string | undefined> => {
  // Use provided token if available
  if (providedToken) {
    return providedToken;
  }

  // If authorization not required, return undefined
  if (!requireAuth) {
    return undefined;
  }

  // Get token from session
  const session = await getCurrentSession();
  const accessToken = session?.accessToken;

  if (!accessToken) {
    throw new ApiError({
      message: 'Authentication required',
      statusCode: 401,
      error: 'Unauthorized',
    });
  }

  return accessToken;
};

/**
 * Perform logout on authentication failure
 */
export const handleAuthFailure = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    await signOut({ redirect: true, callbackUrl: '/en/auth/sign-in' });
  }
};
