import { summaryPath } from '@/lib/seo/book-summary';
import { buildOrganizationJsonLd } from '@/lib/seo/organization-jsonld';
import { buildLangUrl } from '@/lib/seo/urls';
import type { SupportedLang } from '@/lib/i18n/lang';

type SummaryJsonLdInput = {
  lang: SupportedLang;
  bookSlug: string;
  bookTitle: string;
  headline: string;
  /** Имя редакции на языке страницы (`book.editorialTeam`). */
  editorialTeam: string;
  /** `BookSummary.updatedAt` - дата последнего изменения пересказа. */
  updatedAt: string;
};

/**
 * Разметка страницы пересказа (`tech.md` §7.1, `product.md` §9): статья, автор - организация
 * «Редакция Bibliaris» со ссылкой на `/editorial-policy`, связанная с общей организацией через
 * `parentOrganization`. Своего `@id` у автора нет, общий узел не получает второго `url` (решение
 * арбитра `F01 | F01-5`). `dateModified` - дата изменения пересказа, `about` - книга.
 */
export function buildSummaryArticleJsonLd(input: SummaryJsonLdInput) {
  const { lang, bookSlug, bookTitle, headline, editorialTeam, updatedAt } = input;
  const organization = buildOrganizationJsonLd();

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    inLanguage: lang,
    url: buildLangUrl(lang, summaryPath(bookSlug)),
    dateModified: updatedAt,
    author: {
      '@type': 'Organization',
      name: editorialTeam,
      url: buildLangUrl(lang, '/editorial-policy'),
      parentOrganization: { '@id': organization['@id'] },
    },
    about: { '@type': 'Book', name: bookTitle },
  };
}
