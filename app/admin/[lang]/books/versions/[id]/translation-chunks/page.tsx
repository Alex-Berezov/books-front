import { notFound, redirect } from 'next/navigation';
import { TranslationChunks } from '@/components/admin/translation-chunks/TranslationChunks';
import { ADMIN_ONLY_ROLES } from '@/lib/auth/constants';
import { getCurrentUser } from '@/lib/auth/helpers';
import { isSupportedLang } from '@/lib/i18n/lang';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Original | translation | Admin',
  description: 'Original and translation of a run, piece by piece: retry and edit',
};

interface TranslationChunksPageProps {
  params: Promise<{
    lang: SupportedLang;
    id: string;
  }>;
  searchParams: Promise<{
    run?: string | string[];
    book?: string | string[];
    language?: string | string[];
  }>;
}

// Идентификатор из адреса уходит в путь запросов: только одно значение из букв, цифр и дефиса.
const ID_PATTERN = /^[\w-]{1,64}$/;
const idOf = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' && ID_PATTERN.test(value) ? value : null;

/**
 * Повтор куска тратит деньги — только `admin` (F05, U6), тем же отказом, что сравнение моделей:
 * layout админки пускает и `content_manager`, и юриста. Ручки бэкенда отвечают 403 сами.
 * Запуск, книга и язык — в адресе (решение арбитра `F05 | F05-7v-b`).
 */
export default async function TranslationChunksPage({
  params,
  searchParams,
}: TranslationChunksPageProps) {
  const { lang, id } = await params;
  const query = await searchParams;
  const run = idOf(query.run);
  const book = idOf(query.book);
  if (!isSupportedLang(lang) || run === null || book === null) notFound();
  const session = await getCurrentUser();
  const userRoles: readonly string[] = session?.user?.roles ?? [];
  const adminOnlyRoles: readonly string[] = ADMIN_ONLY_ROLES;

  if (!adminOnlyRoles.some((role) => userRoles.includes(role))) {
    redirect(`/${lang}/403`);
  }

  return (
    <TranslationChunks
      lang={lang}
      versionId={id}
      runId={run}
      bookId={book}
      language={typeof query.language === 'string' ? query.language : null}
    />
  );
}
