'use client';

import { type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useResetPassword } from '@/api/hooks/useUsers';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import type { UUID } from '@/types/api-schema/common';
import styles from './PasswordResetModal.module.scss';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface PasswordResetModalProps {
  userId: UUID;
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordResetModal: FC<PasswordResetModalProps> = ({ userId, isOpen, onClose }) => {
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    try {
      await resetPassword.mutateAsync({ id: userId, password: data.password });
      reset();
      onClose();
      alert('Password has been reset successfully');
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onCancel={onClose} title="Reset Password" showFooter={false}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.fieldWrapper}>
          <Input
            placeholder="New Password"
            type="password"
            {...register('password')}
            error={!!errors.password}
            fullWidth
          />
          {errors.password && (
            <span className={styles.errorMessage}>{errors.password.message}</span>
          )}
        </div>

        <div className={styles.fieldWrapper}>
          <Input
            placeholder="Confirm Password"
            type="password"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            fullWidth
          />
          {errors.confirmPassword && (
            <span className={styles.errorMessage}>{errors.confirmPassword.message}</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Reset Password
          </Button>
        </div>
      </form>
    </Modal>
  );
};
