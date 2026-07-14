import type { BookOverview } from './books';
import type { SupportedLang, UUID } from './common';
import type { SeoData } from './pages';

export interface AuthorQuote {
  text: string;
  source?: string;
}

export interface AuthorFaq {
  question: string;
  answer: string;
}

export interface AuthorTranslation {
  language: SupportedLang;
  slug: string;
  name: string;
  biography?: string | null;
  wikidataUrl?: string | null;
  wikipediaUrl?: string | null;
  photoUrl?: string | null;
  quotes?: AuthorQuote[] | null;
  faq?: AuthorFaq[] | null;
  similarSlugs?: string[] | null;
  seo?: SeoData | null;
}

export interface Author {
  id: UUID;
  slug: string; // Keep at root for compatibility with general routing or fallback
  birthDate?: string | null;
  deathDate?: string | null;
  translations?: AuthorTranslation[];
  booksCount?: number;
}

export interface AuthorListItem {
  id: UUID;
  slug: string;
  birthDate?: string | null;
  deathDate?: string | null;
  wikidataUrl?: string | null;
  wikipediaUrl?: string | null;
  photoUrl?: string | null;
  translations?: AuthorTranslation[];
  booksCount: number;
}

export interface PublicAuthorDetail {
  id: UUID;
  slug: string;
  birthDate?: string | null;
  deathDate?: string | null;
  wikidataUrl?: string | null;
  wikipediaUrl?: string | null;
  photoUrl?: string | null;
  name: string;
  biography?: string | null;
  quotes?: AuthorQuote[] | null;
  faq?: AuthorFaq[] | null;
  seo?: SeoData | null;
  similarAuthors: { name: string; slug: string }[];
  books: BookOverview[];
}

export interface CreateAuthorRequest {
  birthDate?: string | null;
  deathDate?: string | null;
  translations: AuthorTranslation[];
}

export interface UpdateAuthorRequest extends Partial<CreateAuthorRequest> {}
export type CheckAuthorSlugResponse = {
  exists: boolean;
  suggestedSlug?: string;
  existingAuthor?: { id: string; slug: string };
};
