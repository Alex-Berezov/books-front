import { UserEditClient } from '@/components/admin/users/UserEditClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit User | Admin',
};

interface EditUserPageProps {
  params: {
    id: string;
    lang: string;
  };
}

export default function EditUserPage({ params }: EditUserPageProps) {
  return <UserEditClient userId={params.id} lang={params.lang} />;
}
