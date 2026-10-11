import { UserEditClient } from '@/components/admin/users/UserEditClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit User | Admin',
};

interface EditUserPageProps {
  params: Promise<{
    id: string;
    lang: string;
  }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id, lang } = await params;
  return <UserEditClient userId={id} lang={lang} />;
}
