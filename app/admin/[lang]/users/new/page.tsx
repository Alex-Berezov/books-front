import { UserForm } from '@/components/admin/users/UserForm';
import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Create User | Admin',
};

interface CreateUserPageProps {
  params: {
    lang: string;
  };
}

export default function CreateUserPage({ params }: CreateUserPageProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create New User</h1>
      <UserForm lang={params.lang} />
    </div>
  );
}
