'use client';

import { type FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDeleteUser } from '@/api/hooks/useUsers';
import { Spinner } from '@/components/admin/shared';
import { Button } from '@/components/common/Button';
import type { UUID } from '@/types/api-schema/common';
import { PasswordResetModal } from './PasswordResetModal';
import styles from './UserEditClient.module.scss';
import { UserForm } from './UserForm';
import { UserRoleManager } from './UserRoleManager';

interface UserEditClientProps {
  userId: UUID;
  lang: string;
}

export const UserEditClient: FC<UserEditClientProps> = ({ userId, lang }) => {
  const router = useRouter();
  const { data: user, isLoading, error } = useUser(userId);
  const deleteUser = useDeleteUser();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteUser.mutateAsync(userId);
      router.push(`/admin/${lang}/users`);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !user) {
    return <div>Error loading user</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit User: {user.displayName || user.email}</h1>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => setIsPasswordModalOpen(true)}>
            Reset Password
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteUser.isPending}>
            Delete User
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainColumn}>
          <UserForm initialData={user} lang={lang} />
        </div>

        <div className={styles.sideColumn}>
          <UserRoleManager user={user} />
        </div>
      </div>

      <PasswordResetModal
        userId={userId}
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
