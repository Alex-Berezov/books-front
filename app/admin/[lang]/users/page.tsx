import { UsersTable } from '@/components/admin/users';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users Management | Admin',
  description: 'Manage users and roles',
};

interface UsersPageProps {
  params: Promise<{
    lang: SupportedLang;
  }>;
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { lang } = await params;
  return <UsersTable lang={lang} />;
}
