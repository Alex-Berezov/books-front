import { USER_ACTIVITIES_PAGE_SIZE } from '@/lib/constants/pagination';
import { httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  UserMeResponse,
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
export const updateProfile = async (data: UpdateProfileRequest): Promise<UserMeResponse> => {
  return httpPatchAuth<UserMeResponse>('/users/profile', data, {
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
 * Helper to upload binary files directly to the uploads direct path with token
 */
const uploadBinaryDirect = (
  uploadUrl: string,
  token: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
    xhr.open('POST', `${apiBaseUrl}${uploadUrl}`, true);
    xhr.setRequestHeader('x-upload-token', token);
    xhr.setRequestHeader('content-type', file.type);

    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.send(file);
  });
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
  const presign = await httpPostAuth<{ key: string; url: string; token: string }>(
    '/uploads/presign',
    {
      type: 'cover',
      contentType: file.type,
      size: file.size,
    }
  );

  // 2. Stream binary data to S3 / Local storage
  await uploadBinaryDirect(presign.url, presign.token, file, onProgress);

  // 3. Confirm upload key to get public Url
  const search = new URLSearchParams({ key: presign.key }).toString();
  const confirm = await httpPostAuth<{ publicUrl: string }>(
    `/uploads/confirm?${search}`,
    undefined
  );

  return confirm.publicUrl;
};
