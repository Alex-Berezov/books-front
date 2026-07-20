import {
  getBookCards,
  getCategoryBookCards,
  getPage,
  getPublicAuthors,
  getPublicCategories,
  getPublicTags,
  getTagBookCards,
} from '@/api/endpoints/public';
import { HomePageContent } from '@/components/public/home/HomePageContent/HomePageContent';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AuthorListItem, BookCollection, BookCollectionData } from '@/types/api-schema';
import type { PageResponse } from '@/types/api-schema';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export const revalidate = 300;

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const dict = getDictionary(lang);
  const title = dict.home?.title || 'Bibliaris';
  const description = dict.home?.subtitle || '';

  return getPageMetadata(lang, '', title, description);
}

function sortByBooksCount<T extends { booksCount?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.booksCount || 0) - (a.booksCount || 0));
}

const MAX_COLLECTION_SECTIONS = 4;
const MAX_TAXONOMIES_PER_SECTION = 4;
const MAX_BOOKS_PER_TAXONOMY = 3;

export default async function PublicLangPage({ params }: Props) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;
  const supportedLang = lang as SupportedLang;

  const dict = getDictionary(supportedLang);

  // Helper: extract nested key from dictionary
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = dict;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  // Fetch all data in parallel
  const [popularRes, newRes, audioRes, catsRes, genresRes, colsRes, tagsRes, authorsRes, pageRes] =
    await Promise.all([
      getBookCards(supportedLang, 1, 10, { sort: 'popular' }).catch(() => null),
      getBookCards(supportedLang, 1, 10, { sort: 'new' }).catch(() => null),
      getBookCards(supportedLang, 1, 10, { type: 'audio' }).catch(() => null),
      getPublicCategories(supportedLang, 'category').catch(() => null),
      getPublicCategories(supportedLang, 'genre').catch(() => null),
      getPublicCategories(supportedLang, 'collection').catch(() => null),
      getPublicTags(supportedLang, { limit: 50 }).catch(() => null),
      getPublicAuthors(supportedLang, { limit: 12 }).catch(() => ({
        data: [] as AuthorListItem[],
        meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
      })),
      getPage(supportedLang, 'homepage-index').catch(() => null as PageResponse | null),
    ]);

  const featuredBooks = popularRes?.items || [];
  const newReleases = newRes?.items || [];
  const audiobooks = audioRes?.items || [];

  // Taxonomy sections: sort by booksCount, top 12
  const allCategories = sortByBooksCount(catsRes?.data || []).slice(0, 12);
  const allGenres = sortByBooksCount(genresRes?.data || []).slice(0, 12);
  const allCollections = sortByBooksCount(colsRes?.data || []).slice(0, 12);
  const allTags = sortByBooksCount(tagsRes?.data || []).slice(0, 12);
  const allAuthors = sortByBooksCount(authorsRes?.data || []).slice(0, 12);

  // Category-based sections (classic, fantasy) via compact endpoints
  const [classicBooks, fantasyBooks] = await Promise.all([
    getCategoryBookCards(supportedLang, 'classics', 1, 8)
      .then((r) => r.items || [])
      .catch(() => {
        return getCategoryBookCards(supportedLang, 'classic-literature', 1, 8)
          .then((r) => r.items || [])
          .catch(() => []);
      }),
    getCategoryBookCards(supportedLang, 'fantasy', 1, 8)
      .then((r) => r.items || [])
      .catch(() => {
        return getCategoryBookCards(supportedLang, 'sci-fi-fantasy', 1, 8)
          .then((r) => r.items || [])
          .catch(() => []);
      }),
  ]);

  // Collection sections from CMS page
  const initialPage = pageRes;
  let collectionSections: BookCollectionData[] = [];
  if (initialPage?.sections) {
    const rawCollections = (
      initialPage.sections.bookCollections as BookCollection[] | undefined
    )?.filter((c) => c.title && c.taxonomies?.length > 0);
    if (rawCollections?.length) {
      const dedupedTags = new Set<string>();
      const sectionPromises = rawCollections.slice(0, MAX_COLLECTION_SECTIONS).map(async (col) => {
        const taxonomies = col.taxonomies.slice(0, MAX_TAXONOMIES_PER_SECTION);
        const results = await Promise.all(
          taxonomies.map((tax) => {
            const slug = tax.slug || '';
            if (tax.type === 'tag') {
              const key = `tag:${slug}`;
              if (dedupedTags.has(key)) return Promise.resolve(null);
              dedupedTags.add(key);
              return getTagBookCardsSafe(supportedLang, slug, 1, MAX_BOOKS_PER_TAXONOMY);
            }
            const key = `cat:${slug}`;
            if (dedupedTags.has(key)) return Promise.resolve(null);
            dedupedTags.add(key);
            return getCategoryBookCardsSafe(supportedLang, slug, 1, MAX_BOOKS_PER_TAXONOMY);
          })
        );
        const seen = new Set<string>();
        const books = results
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .flatMap((r) => r.items || [])
          .filter((b) => {
            if (seen.has(b.id)) return false;
            seen.add(b.id);
            return true;
          });
        return {
          title: col.title,
          description: col.description,
          position: col.position,
          books,
        } as BookCollectionData;
      });
      const sections = await Promise.all(sectionPromises);
      collectionSections = sections.filter((s) => s.books.length > 0);
    }
  }

  // Hero stack: first 4 new releases
  const heroStackBooks = newReleases.slice(0, 4);

  // Audio label
  const audiobooksCount = audiobooks.length;

  // Page sections
  const sections = (initialPage?.sections as Record<string, unknown>) || {};
  const whyBibliaris =
    (sections.whyBibliaris as Array<{ icon: string; title: string; text: string }>) || [];
  const aboutText = (sections.aboutText as string) || '';

  const faqItems = initialPage?.faq as
    | Array<{ question: string; answer: string }>
    | null
    | undefined;

  // Hero text
  const heroTitle = initialPage?.h1 || t('home.title');
  const heroText = initialPage?.shortDescription || t('home.subtitle');

  return (
    <HomePageContent
      lang={supportedLang}
      labels={{
        heroTitle,
        heroText,
        browseLibrary: t('home.browseLibrary'),
        audiobooks: t('home.audiobooks'),
        topPopular: t('home.topPopular'),
        browseByCategory: t('home.browseByCategory'),
        viewAll: t('home.viewAll'),
        booksCount: t('home.booksCount'),
        genres: t('home.genres'),
        curatedCollections: t('home.curatedCollections'),
        newReleases: t('home.newReleases'),
        exploreBookThemes: t('home.exploreBookThemes'),
        classicLiterature: t('home.classicLiterature'),
        fantasyAdventure: t('home.fantasyAdventure'),
        authors: t('home.authors'),
        whyBibliaris: t('home.whyBibliaris'),
        aboutBibliaris: t('home.aboutBibliaris'),
        faq: t('home.faq'),
        viewMore: t('home.viewMore'),
        readLabel: t('book.read'),
        listenLabel: t('book.listen'),
        newLabel: 'New',
        coverAltTemplate: t('a11y.bookCover'),
        unknownAuthor: t('book.unknownAuthor'),
      }}
      featuredBooks={featuredBooks}
      newReleases={newReleases}
      audiobooks={audiobooks}
      classicBooks={classicBooks}
      fantasyBooks={fantasyBooks}
      featuredCategories={allCategories}
      featuredGenres={allGenres}
      featuredCollections={allCollections}
      featuredTags={allTags}
      featuredAuthors={allAuthors}
      collectionSections={collectionSections}
      heroStackBooks={heroStackBooks}
      audiobooksCount={audiobooksCount}
      faqItems={faqItems || null}
      whyBibliaris={whyBibliaris}
      aboutText={aboutText}
    />
  );
}

async function getTagBookCardsSafe(lang: SupportedLang, slug: string, page: number, limit: number) {
  try {
    return getTagBookCards(lang, slug, page, limit);
  } catch {
    return null;
  }
}

async function getCategoryBookCardsSafe(
  lang: SupportedLang,
  slug: string,
  page: number,
  limit: number
) {
  try {
    return getCategoryBookCards(lang, slug, page, limit);
  } catch {
    return null;
  }
}
