'use client';

import { useEffect, type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateUser, useUpdateUser } from '@/api/hooks/useUsers';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Input } from '@/components/common/Input';
import type { User } from '@/types/api-schema/user';
import styles from './UserForm.module.scss';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: User;
  lang: string;
}

export const UserForm: FC<UserFormProps> = ({ initialData, lang }) => {
  const router = useRouter();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      isActive: true,
      password: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        email: initialData.email,
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        isActive: initialData.isActive,
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditMode && initialData) {
        await updateUser.mutateAsync({
          id: initialData.id,
          data: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            isActive: data.isActive,
          },
        });
      } else {
        await createUser.mutateAsync({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          isActive: data.isActive,
          password: data.password || undefined,
        });
      }
      router.push(`/admin/${lang}/users`);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Information</h3>
        
        <div className={styles.row}>
          <div className={styles.fieldWrapper}>
            <Input
              placeholder="First Name"
              {...register('firstName')}
              error={!!errors.firstName}
              fullWidth
            />
            {errors.firstName && (
              <span className={styles.errorMessage}>{errors.firstName.message}</span>
            )}
          </div>
          <div className={styles.fieldWrapper}>
            <Input
              placeholder="Last Name"
              {...register('lastName')}
              error={!!errors.lastName}
              fullWidth
            />
            {errors.lastName && (
              <span className={styles.errorMessage}>{errors.lastName.message}</span>
            )}
          </div>
        </div>

        <div className={styles.fieldWrapper}>
          <Input
            placeholder="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            fullWidth
          />
          {errors.email && (
            <span className={styles.errorMessage}>{errors.email.message}</span>
          )}
        </div>

        {!isEditMode && (
          <div className={styles.fieldWrapper}>
            <Input
              placeholder="Password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              fullWidth
            />
            {errors.password && (
              <span className={styles.errorMessage}>{errors.password.message}</span>
            )}
          </div>
        )}

        <div className={styles.fieldWrapper}>
          <Checkbox
            label="Active User"
            {...register('isActive')}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
        >
          {isEditMode ? 'Save Changes' : 'Create User'}
        </Button>
      </div>
    </form>
  );
};
