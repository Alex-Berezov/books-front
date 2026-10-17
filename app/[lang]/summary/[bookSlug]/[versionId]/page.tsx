import { notFound, permanentRedirect } from 'next/navigation';
import { summaryPath, versionHasSummary } from '@/lib/seo/book-summary';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import type { SupportedLang } from '@/lib/i18n/lang';

type Props = {
  params: Promise<{ lang: string; bookSlug: string; versionId: string }>;
};

/**
 * Старый адрес пересказа: страница переехала на `/{lang}/book/{slug}/summary` (решение
 * владельца 17.10.2026). 308 ведёт на пересказ **той версии, что в адресе**: её язык и слаг,
 * а не язык пути - иначе старая ссылка на чужую версию уходила бы закэшированным 308 в 404.
 * Версия не принадлежит книге или пересказа у неё нет - 404, как и раньше (`LEGACY-084`).
 */
export default async function Page({ params }: Props) {
  const { lang, bookSlug, versionId } = await params;
  const book = await resolveBookForSubroute(
    lang as SupportedLang,
    bookSlug,
    (slug) => `/${lang}/summary/${slug}/${versionId}`
  );

  // 🔴 Нет поля `versions` - отказ, а не «такой версии нет» (схема фронта написана руками).
  if (!Array.isArray(book.versions)) {
    throw new Error(`Book overview for "${bookSlug}" carries no versions array`);
  }
  const version = book.versions.find((v) => v.id === versionId);
  if (version && typeof version._count?.summaries !== 'number') {
    throw new Error(`Book overview for "${bookSlug}" carries no summary count`);
  }
  // Нет версии или у неё нет пересказа - честный 404, а не закэшированный 308 в 404.
  if (!version || !versionHasSummary(version)) notFound();

  const targetLang = version.language ?? lang;
  const targetSlug = version.slug || book.slug || bookSlug;
  permanentRedirect(`/${targetLang}${summaryPath(targetSlug)}`);
}
