import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '@/components/common/Modal';
import styles from './ReplyCommentModal.module.scss';

const replySchema = z.object({
  content: z.string().trim().min(1, 'Reply content is required'),
});

type ReplyFormData = z.infer<typeof replySchema>;

interface ReplyCommentModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (data: ReplyFormData) => void;
}

export const ReplyCommentModal: FC<ReplyCommentModalProps> = (props) => {
  const { isOpen, isLoading = false, onClose, onSubmit } = props;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
    defaultValues: { content: '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleFormSubmit = (data: ReplyFormData) => {
    onSubmit(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Reply to Comment"
      confirmText="Reply"
      cancelText="Cancel"
      isLoading={isLoading}
      onConfirm={handleSubmit(handleFormSubmit)}
      onCancel={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)}>
        {/* 🔴 Plain text on purpose (LEGACY-415): readers see `{comment.text}` escaped, and the
            same field holds reader reviews, so it must never be rendered as HTML. */}
        <textarea
          {...register('content')}
          className={`${styles.textarea} ${errors.content ? styles.error : ''}`}
          placeholder="Write your reply here..."
          aria-label="Reply content"
          aria-invalid={!!errors.content}
          disabled={isLoading}
        />
        {errors.content && <span className={styles.errorText}>{errors.content.message}</span>}
      </form>
    </Modal>
  );
};
