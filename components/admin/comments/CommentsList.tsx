'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import {
  useComments,
  useUpdateCommentStatus,
  useDeleteComment,
  useReplyToComment,
} from '@/api/hooks/useComments';
import { EmptyState, Skeleton } from '@/components/admin/shared';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { Pagination } from '@/components/admin/shared/Pagination';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import type { Comment, CommentStatus } from '@/types/api-schema/comments';
import { CommentItem } from './CommentItem';
import styles from './CommentsList.module.scss';
import { ReplyCommentModal } from './ReplyCommentModal';

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Visible', value: 'visible' },
  { label: 'Hidden', value: 'hidden' },
];

export const CommentsList: FC = () => {
  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'all'>('all');
  const [debouncedSearch] = useDebounce(search, 500);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);

  // Queries & Mutations
  const { data, isLoading } = useComments({
    page,
    limit: 10,
    search: debouncedSearch,
    status: statusFilter,
  });

  const updateStatusMutation = useUpdateCommentStatus();
  const deleteMutation = useDeleteComment();
  const replyMutation = useReplyToComment();

  // Handlers
  const handleToggleStatus = (id: string, currentStatus: CommentStatus) => {
    const newStatus = currentStatus === 'visible' ? 'hidden' : 'visible';
    updateStatusMutation.mutate({ id, data: { status: newStatus } });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleReplySubmit = (data: { content: string }) => {
    if (replyId) {
      replyMutation.mutate(
        { id: replyId, data },
        {
          onSuccess: () => setReplyId(null),
        }
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Comments</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.search}>
          <Input
            placeholder="Search by author or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as CommentStatus | 'all')}
        />
      </div>

      <div className={styles.list}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border-light)' }}
            >
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <Skeleton variant="avatar" />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="200px" style={{ marginBottom: '4px' }} />
                  <Skeleton variant="text" width="150px" />
                </div>
                <Skeleton variant="button" width="100px" />
              </div>
              <Skeleton variant="text" width="100%" style={{ marginBottom: '8px' }} />
              <Skeleton variant="text" width="80%" />
            </div>
          ))
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="No comments found"
            description={
              search ? 'Try a different search term' : 'No comments have been posted yet'
            }
            icon={<MessageSquare />}
          />
        ) : (
          data?.data.map((comment: Comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onToggleStatus={handleToggleStatus}
              onDelete={setDeleteId}
              onReply={setReplyId}
              isUpdating={updateStatusMutation.isPending}
            />
          ))
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className={styles.pagination}>
          <Pagination currentPage={page} totalPages={data.meta.totalPages} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ReplyCommentModal
        isOpen={!!replyId}
        isLoading={replyMutation.isPending}
        onClose={() => setReplyId(null)}
        onSubmit={handleReplySubmit}
      />
    </div>
  );
};
