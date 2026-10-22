import { notFound, redirect } from 'next/navigation';
import { TranslationCompare } from '@/components/admin/translation-compare/TranslationCompare/TranslationCompare';
import { ADMIN_ONLY_ROLES } from '@/lib/auth/constants';
import { getCurrentUser } from '@/lib/auth/helpers';
import { isSupportedLang } from '@/lib/i18n/lang';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Translation compare | Admin',
  description: 'Compare translation models on one chapter of a book version',
};

interface TranslationComparePageProps {
  params: Promise<{
    lang: SupportedLang;
    id: string;
  }>;
}

/**
 * Сравнение тратит деньги — только `admin` (F05, U6), тем же отказом, что экран «LLM settings»:
 * layout админки пускает и `content_manager`, и юриста. Ручки бэкенда отвечают 403 сами.
 */
export default async function TranslationComparePage({ params }: TranslationComparePageProps) {
  const { lang, id } = await params;
  if (!isSupportedLang(lang)) notFound();
  const session = await getCurrentUser();
  const userRoles: readonly string[] = session?.user?.roles ?? [];
  const adminOnlyRoles: readonly string[] = ADMIN_ONLY_ROLES;

  if (!adminOnlyRoles.some((role) => userRoles.includes(role))) {
    redirect(`/${lang}/403`);
  }

  return <TranslationCompare lang={lang} versionId={id} />;
}
