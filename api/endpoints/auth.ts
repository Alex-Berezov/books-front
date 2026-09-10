import { presignUpload, resolveUploadedUrl, sendPresignedBody } from '@/api/endpoints/uploads';
import { USER_ACTIVITIES_PAGE_SIZE } from '@/lib/constants/pagination';
import { httpGetAuth, httpPatchAuth } from '@/lib/http-client';
import type {
  UserMeResponse,
  UserProfileResponse,
  UpdateProfileRequest,
  GetUserActivitiesParams,
  UserActivitiesResponse,
  UserActivity,
} from '@/types/api-schema';

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
export const updateProfile = async (data: UpdateProfileRequest): Promise<UserProfileResponse> => {
  return httpPatchAuth<UserProfileResponse>('/users/profile', data, {
    requireAuth: true,
  });
};

/**
 * Get current user activities (comments, parents, and replies)
 *
 * @param params - Pagination (page, limit) — `LEGACY-218`: список больше не отдаётся
 * одним неограниченным куском
 * @returns Paginated user activities list
 *
 * ⚠️ Ответ разбирается в двух формах, и это не перестраховка. Смена формы —
 * ломающее изменение контракта (`LEGACY-177`), а выкатываются стороны врозь:
 * бэкенд уезжает тегом, фронт — пушем в `main`. Безопасного порядка у этой пары
 * нет: старый фронт на новом бэкенде читает `length` у объекта и показывает пустую
 * активность, новый фронт на старом бэкенде разворачивает `undefined` и роняет
 * страницу профиля целиком. Ветку со старым массивом снимать вместе с окном
 * выката, а не раньше (найдено ревью при закрытии `LEGACY-218`).
 */
export const getUserActivities = async (
  params: GetUserActivitiesParams = {}
): Promise<UserActivitiesResponse> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? USER_ACTIVITIES_PAGE_SIZE;
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  const body = await httpGetAuth<UserActivitiesResponse | UserActivity[]>(
    `/users/me/activities?${query.toString()}`,
    { requireAuth: true }
  );

  if (Array.isArray(body)) {
    return { items: body, total: body.length, page: 1, limit, hasNext: false };
  }
  return body;
};

/**
 * Direct file upload flow for avatars
 *
 * @param file - Image file to upload
 * @param onProgress - Optional callback for upload progress
 * @returns Resolved public URL of the uploaded image
 */
export const uploadAvatar = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  // 1. Get presigned details
  const contentType = file.type || 'application/octet-stream';
  const presign = await presignUpload({ type: 'cover', contentType, size: file.size });

  // 2. Stream binary data to the storage driver.
  //
  // 🔴 Общая обёртка, а не своя: до 10.09.2026 здесь стояла вторая копия XHR-загрузки, которая
  // прошивала `POST`, склеивала адрес строкой и не ставила `Authorization` вовсе - то есть
  // повторяла все три половины `LEGACY-372` на пути аватара, где загрузка живая.
  await sendPresignedBody(presign, contentType, file, { onProgress });

  // 3. Confirm upload key to get public Url
  const confirm = await resolveUploadedUrl(presign.key);

  return confirm.publicUrl;
};
