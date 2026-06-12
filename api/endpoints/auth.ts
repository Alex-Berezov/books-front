import { httpGetAuth, httpPatchAuth } from '@/lib/http-client';
import type { UserMeResponse, UpdateProfileRequest, UserActivity } from '@/types/api-schema';

/**
 * Get current user data
 *
 * @returns User data
 *
 * @example
 * ```ts
 * const user = await getMe();
 * console.log(user.email, user.roles);
 * ```
 */
export const getMe = async (): Promise<UserMeResponse> => {
  return httpGetAuth<UserMeResponse>('/users/me', {
    requireAuth: true,
  });
};

/**
 * Update user profile settings
 *
 * @param data - Profile update payload
 * @returns Updated user profile data
 */
export const updateProfile = async (data: UpdateProfileRequest): Promise<UserMeResponse> => {
  return httpPatchAuth<UserMeResponse>('/users/profile', data, {
    requireAuth: true,
  });
};

/**
 * Get current user activities (comments, parents, and replies)
 *
 * @returns Array of user activities
 */
export const getUserActivities = async (): Promise<UserActivity[]> => {
  return httpGetAuth<UserActivity[]>('/users/me/activities', {
    requireAuth: true,
  });
};
