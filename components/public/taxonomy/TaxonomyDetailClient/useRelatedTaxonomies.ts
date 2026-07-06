'use client';

import { useMemo } from 'react';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, Category, CategoryType, Tag } from '@/types/api-schema';

export interface TaxonomyLink {
  id: string;
  name: string;
  slug: string;
  type: CategoryType | 'tag';
  booksCount: number;
}

function getCategoryTranslated(cat: Category, lang: SupportedLang): { name: string; slug: string } {
  const translation = cat.translation || cat.translations?.find((t) => t.language === lang) || null;
  return {
    name: translation?.name || cat.name || cat.id,
    slug: translation?.slug || cat.slug || cat.id,
  };
}

function getTagTranslated(tag: Tag, lang: SupportedLang): { name: string; slug: string } {
  const translation = tag.translations?.find((t) => t.language === lang) || null;
  return {
    name: translation?.name || tag.name || tag.id,
    slug: translation?.slug || tag.slug || tag.id,
  };
}

function isValidTaxonomy(item: {
  isVisible?: boolean;
  indexable?: boolean;
  booksCount?: number;
}): boolean {
  return item.isVisible !== false && item.booksCount !== 0;
}

function sortByFrequencyAndName<T extends { name: string; booksCount: number }>(items: T[]): T[] {
  return items.sort((a, b) => {
    if (b.booksCount !== a.booksCount) return b.booksCount - a.booksCount;
    return a.name.localeCompare(b.name);
  });
}

interface UseRelatedTaxonomiesOptions {
  books: BookOverview[];
  currentId?: string;
  lang: SupportedLang;
}

export function useRelatedTaxonomies({ books, currentId, lang }: UseRelatedTaxonomiesOptions) {
  return useMemo(() => {
    const categoryMap = new Map<string, TaxonomyLink>();
    const genreMap = new Map<string, TaxonomyLink>();
    const collectionMap = new Map<string, TaxonomyLink>();
    const tagMap = new Map<string, TaxonomyLink>();

    for (const book of books) {
      for (const cat of book.categories || []) {
        if (cat.id === currentId) continue;
        if (!isValidTaxonomy(cat)) continue;

        const targetMap =
          cat.type === 'genre' ? genreMap : cat.type === 'collection' ? collectionMap : categoryMap;

        const existing = targetMap.get(cat.id);
        if (existing) {
          existing.booksCount += 1;
        } else {
          const translated = getCategoryTranslated(cat, lang);
          targetMap.set(cat.id, {
            id: cat.id,
            name: translated.name,
            slug: translated.slug,
            type: cat.type,
            booksCount: 1,
          });
        }
      }

      for (const tag of book.tags || []) {
        if (tag.id === currentId) continue;
        if (!isValidTaxonomy(tag)) continue;

        const existing = tagMap.get(tag.id);
        if (existing) {
          existing.booksCount += 1;
        } else {
          const translated = getTagTranslated(tag, lang);
          tagMap.set(tag.id, {
            id: tag.id,
            name: translated.name,
            slug: translated.slug,
            type: 'tag',
            booksCount: 1,
          });
        }
      }
    }

    const sortByCount = (items: TaxonomyLink[]) => sortByFrequencyAndName(items).slice(0, 8);

    const sortTags = (items: TaxonomyLink[]) => sortByFrequencyAndName(items).slice(0, 12);

    return {
      relatedCategories: sortByCount(Array.from(categoryMap.values())),
      relatedGenres: sortByCount(Array.from(genreMap.values())),
      relatedCollections: sortByCount(Array.from(collectionMap.values())),
      relatedTags: sortTags(Array.from(tagMap.values())),
    };
  }, [books, currentId, lang]);
}
