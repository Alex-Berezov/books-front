import { notFound, redirect } from 'next/navigation';
import { LlmSettings } from '@/components/admin/llm-settings/LlmSettings/LlmSettings';
import { ADMIN_ONLY_ROLES } from '@/lib/auth/constants';
import { getCurrentUser } from '@/lib/auth/helpers';
import { isSupportedLang } from '@/lib/i18n/lang';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LLM settings | Admin',
  description: 'Models of the translation pipeline stages and the spending ceiling',
};

interface LlmSettingsPageProps {
  params: Promise<{
    lang: SupportedLang;
  }>;
}

/**
 * Экран тратит деньги — только `admin` (F05, U6). Layout админки пускает и `content_manager`,
 * и юриста, поэтому роль проверяется здесь же, тем же отказом, что и у layout: `/{lang}/403`.
 * Скрытого пункта меню мало — прямую ссылку он не закрывает; ручки бэкенда отвечают 403 сами.
 */
export default async function LlmSettingsPage({ params }: LlmSettingsPageProps) {
  const { lang } = await params;
  // Язык проверяется здесь же: layout и страница рендерятся параллельно, и адрес отказа
  // не собирается из непроверенного сегмента.
  if (!isSupportedLang(lang)) notFound();
  const session = await getCurrentUser();
  const userRoles: readonly string[] = session?.user?.roles ?? [];
  const adminOnlyRoles: readonly string[] = ADMIN_ONLY_ROLES;

  if (!adminOnlyRoles.some((role) => userRoles.includes(role))) {
    redirect(`/${lang}/403`);
  }

  return <LlmSettings />;
}
