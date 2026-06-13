import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import * as commentsApi from '@/api/endpoints/comments';
import type { ApiError } from '@/types/api';
import type {
  BookCommentsResponse,
  ClientComment,
  CreateCommentRequest,
  GetBookCommentsParams,
  ToggleLikeRequest,
  ToggleLikeResponse,
  LikeCountResponse,
} from '@/types/api-schema';

export const bookCommentsKeys = {
  all: ['bookComments'] as const,
  lists: () => [...bookCommentsKeys.all, 'list'] as const,
  list: (params: GetBookCommentsParams) => [...bookCommentsKeys.lists(), params] as const,
  likes: (target: string, targetId: string) =>
    [...bookCommentsKeys.all, 'likes', target, targetId] as const,
};

/**
 * Fetch comments/reviews for a target (book version, chapter, audio)
 */
export const useBookComments = (
  params: GetBookCommentsParams,
  options?: Omit<UseQueryOptions<BookCommentsResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<BookCommentsResponse, ApiError>({
    queryKey: bookCommentsKeys.list(params),
    queryFn: () => commentsApi.getComments(params),
    ...options,
  });
};

/**
 * Create a new comment or review
 */
export const useCreateBookComment = () => {
  const queryClient = useQueryClient();

  return useMutation<ClientComment, ApiError, CreateCommentRequest>({
    mutationFn: (data: CreateCommentRequest) => commentsApi.createComment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookCommentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['userActivities'] });
    },
  });
};

/**
 * Update a comment text
 */
export const useUpdateBookComment = () => {
  const queryClient = useQueryClient();

  return useMutation<ClientComment, ApiError, { id: string; text: string }>({
    mutationFn: ({ id, text }) => commentsApi.updateComment(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookCommentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['userActivities'] });
    },
  });
};

/**
 * Delete a comment (soft delete)
 */
export const useDeleteBookComment = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id: string) => commentsApi.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookCommentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['userActivities'] });
    },
  });
};

/**
 * Toggle like/dislike reaction on comment/review
 */
export const useToggleCommentReaction = () => {
  const queryClient = useQueryClient();

  return useMutation<ToggleLikeResponse, ApiError, ToggleLikeRequest>({
    mutationFn: (data: ToggleLikeRequest) => commentsApi.toggleLike(data),
    onSuccess: (_, variables) => {
      const target = variables.commentId ? 'comment' : 'bookVersion';
      const targetId = (variables.commentId ?? variables.bookVersionId) as string;
      queryClient.invalidateQueries({ queryKey: bookCommentsKeys.likes(target, targetId) });
      queryClient.invalidateQueries({ queryKey: bookCommentsKeys.lists() });
    },
  });
};

/**
 * Get reaction counts for a target
 */
export const useCommentLikes = (
  target: 'comment' | 'bookVersion',
  targetId: string,
  options?: Omit<UseQueryOptions<LikeCountResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<LikeCountResponse, ApiError>({
    queryKey: bookCommentsKeys.likes(target, targetId),
    queryFn: () => commentsApi.getLikeCount(target, targetId),
    enabled: !!targetId,
    ...options,
  });
};
