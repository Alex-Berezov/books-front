import { UsersTable } from '@/components/admin/users';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users Management | Admin',
  description: 'Manage users and roles',
};

interface UsersPageProps {
  params: {
    lang: SupportedLang;
  };
}

export default function UsersPage({ params }: UsersPageProps) {
  return <UsersTable lang={params.lang} />;
}
