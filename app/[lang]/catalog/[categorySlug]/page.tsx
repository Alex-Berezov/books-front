import { permanentRedirect, notFound } from 'next/navigation';
import { resolveSeo } from '@/api/endpoints/public';
import { resolveRetiredSlug } from '@/lib/seo/retired-slug';
import { isNotFoundError } from '@/lib/utils/content-failure';
import type { SupportedLang } from '@/lib/i18n/lang';

type Props = {
  params: Promise<{ lang: string; categorySlug: string }>;
};

/**
 * Устаревший адрес каталога: `/{lang}/catalog/{slug}` уводит на нынешний сегмент
 * термина. Решение принимается по ответу API, поэтому кэшировать его нельзя —
 * иначе вердикт, вынесенный во время сбоя, залипает в ISR (как это было до
 * 09.08.2026: ни `dynamic`, ни `revalidate` здесь не стояло вовсе).
 */
export const dynamic = 'force-dynamic';

const SEGMENTS = ['category', 'genre', 'collection'] as const;

type Segment = (typeof SEGMENTS)[number];

/**
 * Отвечает ли API «такого термина нет» — или не отвечает вовсе.
 *
 * 🔴 Различать обязательно. Прежде здесь стояли голые `catch {}`, и 500, 429 или
 * таймаут были неотличимы от честного 404: посетитель получал **постоянный** 308
 * на общий каталог, то есть решение, принятое во время сбоя, закреплялось навсегда.
 * Не-404 обязан всплыть как 5xx — его никто не кэширует как «страницы нет».
 */
const resolvesToTerm = async (lang: SupportedLang, segment: Segment, slug: string) => {
  try {
    await resolveSeo(lang, segment, slug);
    return true;
  } catch (error) {
    if (isNotFoundError(error)) return false;
    throw error;
  }
};

export default async function CatalogRedirectPage({ params }: Props) {
  const { lang, categorySlug } = await params;
  const supportedLang = lang as SupportedLang;

  for (const segment of SEGMENTS) {
    if (await resolvesToTerm(supportedLang, segment, categorySlug)) {
      permanentRedirect(`/${supportedLang}/${segment}/${categorySlug}`);
    }
  }

  // Все три типа честно ответили 404 — только теперь история слагов имеет право
  // говорить (LEGACY-062). Порядок обязателен: слаг, освобождённый и занятый
  // заново, иначе увёл бы посетителя со страницы, которая существует.
  //
  // Назначение — сегмент `category`: тип нового термина здесь неизвестен, а страница
  // термина резолвит любой тип под любым сегментом и сама уводит на правильный
  // (`resolveTaxonomyDestination`). Два перехода вместо одного — плата за то, что
  // на этом уровне тип не выяснить, не потратив ещё три запроса.
  const retired = await resolveRetiredSlug('category', supportedLang, categorySlug);
  if (retired && retired !== categorySlug) {
    permanentRedirect(`/${supportedLang}/category/${retired}`);
  }

  // Преемника нет. Честный 404, а НЕ постоянный редирект на общий каталог: перенос
  // на нерелевантный хаб теряет накопленные сигналы полнее, чем 404, и делает это
  // необратимо — 308 остаётся в индексе навсегда.
  notFound();
}
