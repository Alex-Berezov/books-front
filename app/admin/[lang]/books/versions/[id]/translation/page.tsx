import { notFound, redirect } from 'next/navigation';
import { TranslationRunScreen } from '@/components/admin/translation-run';
import { ADMIN_ONLY_ROLES } from '@/lib/auth/constants';
import { getCurrentUser } from '@/lib/auth/helpers';
import { isSupportedLang } from '@/lib/i18n/lang';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Translation | Admin',
  description: 'Translation runs of a book version: status, cost and details',
};

interface TranslationPageProps {
  params: Promise<{
    lang: SupportedLang;
    id: string;
  }>;
}

/**
 * Перевод тратит деньги — только `admin` (F05, U6), тем же отказом, что сравнение моделей:
 * layout админки пускает и `content_manager`, и юриста. Ручки бэкенда отвечают 403 сами.
 */
export default async function TranslationPage({ params }: TranslationPageProps) {
  const { lang, id } = await params;
  if (!isSupportedLang(lang)) notFound();
  const session = await getCurrentUser();
  const userRoles: readonly string[] = session?.user?.roles ?? [];
  const adminOnlyRoles: readonly string[] = ADMIN_ONLY_ROLES;

  if (!adminOnlyRoles.some((role) => userRoles.includes(role))) {
    redirect(`/${lang}/403`);
  }

  return <TranslationRunScreen lang={lang} versionId={id} />;
}
