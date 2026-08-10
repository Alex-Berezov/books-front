import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/api/endpoints/admin';
import type {
  GetCommentsParams,
  ModerateCommentRequest,
  CreateReplyRequest,
} from '@/types/api-schema/comments';
import type { UUID } from '@/types/api-schema/common';

export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (params: GetCommentsParams) => [...commentKeys.lists(), params] as const,
};

export const useComments = (params: GetCommentsParams) => {
  return useQuery({
    queryKey: commentKeys.list(params),
    queryFn: () => commentsApi.getComments(params),
  });
};

export const useModerateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: ModerateCommentRequest }) =>
      commentsApi.moderateComment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: UUID) => commentsApi.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
};

export const useReplyToComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReplyRequest) => commentsApi.replyToComment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
};
