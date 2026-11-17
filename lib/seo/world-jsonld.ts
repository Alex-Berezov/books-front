import { buildEditorialArticleJsonLd } from '@/lib/seo/analysis-jsonld';
import { buildLangUrl } from '@/lib/seo/urls';
import { worldEntityPath, worldPath } from '@/lib/seo/world-path';
import type { SupportedLang } from '@/lib/i18n/lang';

type WorldJsonLdInput = {
  lang: SupportedLang;
  /** Слаг адреса страницы (канонический слаг книги на этом языке). */
  pageSlug: string;
  /** Слаг, которым бэкенд строит `@id` книги (`bookCardSlug`, `LEGACY-472`). */
  bookSchemaSlug: string;
  /** Ключ сущности; нет - общая страница `/wiki`. */
  entityKey?: string;
  headline: string;
  /** Имя редакции на языке страницы (`book.editorialTeam`). */
  editorialTeam: string;
  /** Дата публикации: у общей страницы раннее `updatedAt` публичных сущностей. */
  createdAt: string;
  updatedAt: string;
  coverUrl?: string | null;
};

/**
 * Разметка страницы мира книги (`product.md` §16): статья редакции - тот же построитель, что
 * у анализа (`buildEditorialArticleJsonLd`), на адресе `/wiki` или `/wiki/{key}`.
 */
export function buildWorldArticleJsonLd(input: WorldJsonLdInput) {
  const { pageSlug, entityKey, ...rest } = input;
  return buildEditorialArticleJsonLd({
    ...rest,
    url: buildLangUrl(
      input.lang,
      entityKey ? worldEntityPath(pageSlug, entityKey) : worldPath(pageSlug)
    ),
  });
}
