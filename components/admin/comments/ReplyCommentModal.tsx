import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '@/components/common/Modal';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import styles from './ReplyCommentModal.module.scss';

const replySchema = z.object({
  content: z.string().min(1, 'Reply content is required'),
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
    control,
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
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={isLoading}
              placeholder="Write your reply here..."
              error={!!errors.content}
              minHeight="140px"
              ariaLabel="Reply content"
            />
          )}
        />
        {errors.content && <span className={styles.errorText}>{errors.content.message}</span>}
      </form>
    </Modal>
  );
};
