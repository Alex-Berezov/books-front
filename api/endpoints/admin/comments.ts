import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  Comment,
  CommentsResponse,
  CreateReplyRequest,
  GetCommentsParams,
  ModerateCommentRequest,
} from '@/types/api-schema/comments';
import type { UUID } from '@/types/api-schema/common';

/**
 * 🔴 До 10.08.2026 весь этот файл был написан против API, которого не
 * существует (`LEGACY-092`): `GET /comments?page=…` отвечал 400 (публичный
 * листинг требует `target` и `targetId`), а `PATCH /comments/:id/status` и
 * `POST /comments/:id/reply` — 404. Модерация отзывов не работала вовсе.
 *
 * ⚠️ Проверять контракт нужно **запросом к API**, а не чтением кода: вызовы
 * лежали в репозитории, выглядели рабочими и потому попали в `LEGACY-089`
 * блокером — из-за них простая правка полгода считалась задачей, требующей
 * раздельного ответа по роли.
 */
export const commentsApi = {
  getComments: (params: GetCommentsParams) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.search) queryParams.append('search', params.search);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.bookId) queryParams.append('bookId', params.bookId);

    const endpoint = `/admin/comments?${queryParams.toString()}`;
    return httpGetAuth<CommentsResponse>(endpoint);
  },

  /**
   * Скрытие и раскрытие идут обычным `PATCH /comments/:id` с `isHidden` —
   * отдельного «status» у комментария нет ни в схеме, ни в API.
   */
  moderateComment: (id: UUID, data: ModerateCommentRequest) => {
    return httpPatchAuth<Comment>(`/comments/${id}`, data);
  },

  deleteComment: (id: UUID) => {
    return httpDeleteAuth(`/comments/${id}`);
  },

  /**
   * Ответ — это обычный комментарий с `parentId`. Цель (`bookVersionId`)
   * обязательна: у создания комментария действует XOR по полям цели, и одного
   * `parentId` серверу мало.
   */
  replyToComment: (data: CreateReplyRequest) => {
    return httpPostAuth<Comment>('/comments', data);
  },
};
