import { analysisPath } from '@/lib/seo/analysis-path';
import { buildOrganizationJsonLd } from '@/lib/seo/organization-jsonld';
import { buildLangUrl } from '@/lib/seo/urls';
import type { SupportedLang } from '@/lib/i18n/lang';

type AnalysisJsonLdInput = {
  lang: SupportedLang;
  /** Слаг адреса страницы (канонический слаг книги на этом языке). */
  pageSlug: string;
  /**
   * Слаг, которым бэкенд строит `@id` книги в её разметке (`generateBookSchema`: слаг версии,
   * а без него - слаг книги, `bookCardSlug`, `LEGACY-472`). `about` ссылается на тот же узел.
   */
  bookSchemaSlug: string;
  headline: string;
  /** Имя редакции на языке страницы (`book.editorialTeam`). */
  editorialTeam: string;
  /** `BookAnalysis.createdAt` и `updatedAt`. */
  createdAt: string;
  updatedAt: string;
  coverUrl?: string | null;
};

/** `@id` узла книги в разметке страницы книги - то же правило, что `generateBookSchema` бэкенда. */
export function bookSchemaId(lang: string, bookSchemaSlug: string): string {
  return `${buildLangUrl(lang, `/book/${bookSchemaSlug}`)}#book`;
}

/** Вход общего построителя: адрес страницы уже собран (`buildLangUrl`). */
type EditorialArticleInput = Omit<AnalysisJsonLdInput, 'pageSlug'> & { url: string };

/**
 * Статья редакции на странице раздела книги (анализ F03, мир книги F08): автор - организация
 * «Редакция Bibliaris», как у пересказа (`summary-jsonld.ts`); даты публикации и правки; картинка -
 * обложка; `about` - узел книги по её `@id`. `BreadcrumbList` выводят видимые крошки
 * (`Breadcrumbs`) - второй раз его здесь нет. Один построитель на разделы, разнится только `url`.
 */
export function buildEditorialArticleJsonLd(input: EditorialArticleInput) {
  const { lang, url, bookSchemaSlug, headline, editorialTeam, createdAt, updatedAt } = input;
  const organization = buildOrganizationJsonLd();

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    inLanguage: lang,
    url,
    datePublished: createdAt,
    dateModified: updatedAt,
    ...(input.coverUrl ? { image: input.coverUrl } : {}),
    author: {
      '@type': 'Organization',
      name: editorialTeam,
      url: buildLangUrl(lang, '/editorial-policy'),
      parentOrganization: { '@id': organization['@id'] },
    },
    about: { '@id': bookSchemaId(lang, bookSchemaSlug) },
  };
}

/**
 * Разметка страницы анализа (`product.md` §22, `tech.md` §7): статья редакции
 * (`buildEditorialArticleJsonLd`) с датами анализа на адресе `/analysis`.
 */
export function buildAnalysisArticleJsonLd(input: AnalysisJsonLdInput) {
  const { pageSlug, ...rest } = input;
  return buildEditorialArticleJsonLd({
    ...rest,
    url: buildLangUrl(input.lang, analysisPath(pageSlug)),
  });
}
