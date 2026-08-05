import Link from 'next/link';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './book.module.scss';

export interface BookTaxonomyTerm {
  id: string;
  name?: string;
  slug?: string;
  type?: string;
  isVisible?: boolean;
  indexable?: boolean;
  booksCount?: number;
  translations?: Array<{
    language: string;
    name: string;
    slug: string;
    autoIndexable?: boolean;
  }>;
}

export interface BookTaxonomyChipsProps {
  lang: SupportedLang;
  terms: BookTaxonomyTerm[];
  variant: 'categories' | 'tags';
}

const routeSegment = (term: BookTaxonomyTerm, variant: BookTaxonomyChipsProps['variant']) => {
  if (variant === 'tags') return 'tag';
  return term.type === 'genre' ? 'genre' : 'category';
};

/**
 * Categories and tags attached to a book.
 *
 * A term that answers `noindex` still carries meaning for the reader, so it stays
 * on the page — but as plain text, never as an internal link. Indexability is read
 * strictly from the page language's translation: a term translated only into some
 * other language is not linkable here.
 */
export function BookTaxonomyChips({ lang, terms, variant }: BookTaxonomyChipsProps) {
  if (terms.length === 0) return null;

  const containerClass = variant === 'tags' ? styles.bookTagsContainer : styles.tagsContainer;

  return (
    <div className={containerClass}>
      {terms.map((term) => {
        const localTranslation = term.translations?.find((t) => t.language === lang);
        const displayed = localTranslation || term.translations?.[0];
        const label = displayed?.name || term.name || term.id;
        const slug = displayed?.slug || term.slug || term.id;

        const linkable = isTaxonomyLinkable({
          isVisible: term.isVisible,
          indexable: term.indexable,
          autoIndexable: localTranslation?.autoIndexable,
          booksCount: term.booksCount,
        });

        if (!linkable) {
          return (
            <span key={term.id} className={styles.tagButton}>
              {label}
            </span>
          );
        }

        return (
          <Link
            key={term.id}
            href={`/${lang}/${routeSegment(term, variant)}/${slug}`}
            className={styles.tagButton}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
