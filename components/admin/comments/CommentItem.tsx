import type { FC } from 'react';
import { Eye, EyeOff, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { Comment } from '@/types/api-schema/comments';
import styles from './CommentItem.module.scss';

interface CommentItemProps {
  comment: Comment;
  onToggleStatus: (id: string, currentStatus: 'visible' | 'hidden') => void;
  onDelete: (id: string) => void;
  onReply?: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export const CommentItem: FC<CommentItemProps> = (props) => {
  const {
    comment,
    onToggleStatus,
    onDelete,
    onReply,
    isUpdating = false,
    isDeleting = false,
  } = props;

  const {
    id,
    content,
    authorName,
    authorEmail,
    bookTitle,
    createdAt,
    status,
    repliesCount,
  } = comment;

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(createdAt));
  const isVisible = status === 'visible';

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <div className={styles.author}>
          <div className={styles.avatar}>
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div className={styles.info}>
            <span className={styles.name}>{authorName}</span>
            {authorEmail && <span className={styles.email}>{authorEmail}</span>}
          </div>
        </div>
        <div className={`${styles.status} ${styles[status]}`}>
          {status}
        </div>
      </div>

      <div className={styles.book}>
        On book: <strong>{bookTitle}</strong>
      </div>

      <div className={styles.content}>{content}</div>

      <div className={styles.meta}>
        <span>{formattedDate}</span>
        {repliesCount > 0 && (
          <span>
            {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
          </span>
        )}
      </div>

      <div className={styles.actions}>
        {onReply && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onReply(id)}
            leftIcon={<MessageSquare size={16} />}
          >
            Reply
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onToggleStatus(id, status)}
          loading={isUpdating}
          leftIcon={isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        >
          {isVisible ? 'Hide' : 'Show'}
        </Button>

        <Button
          variant="danger"
          size="sm"
          onClick={() => onDelete(id)}
          loading={isDeleting}
          leftIcon={<Trash2 size={16} />}
        >
          Delete
        </Button>
      </div>
    </div>
  );
};
