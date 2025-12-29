import { CommentsList } from '@/components/admin/comments/CommentsList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Comments Management | Admin',
  description: 'Manage user comments',
};

export default function CommentsPage() {
  return <CommentsList />;
}
