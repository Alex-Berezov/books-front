import type { BookOverview } from './books';
import type { SupportedLang, UUID } from './common';

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
  name: string;
  biography?: string | null;
  quotes?: AuthorQuote[] | null;
  faq?: AuthorFaq[] | null;
  similarSlugs?: string[] | null;
}

export interface Author {
  id: UUID;
  slug: string;
  birthDate?: string | null;
  deathDate?: string | null;
  wikidataUrl?: string | null;
  wikipediaUrl?: string | null;
  translations?: AuthorTranslation[];
  booksCount?: number;
}

export interface PublicAuthorDetail {
  id: UUID;
  slug: string;
  birthDate?: string | null;
  deathDate?: string | null;
  wikidataUrl?: string | null;
  wikipediaUrl?: string | null;
  name: string;
  biography?: string | null;
  quotes?: AuthorQuote[] | null;
  faq?: AuthorFaq[] | null;
  similarAuthors: { name: string; slug: string }[];
  books: BookOverview[];
}

export interface CreateAuthorRequest {
  slug: string;
  birthDate?: string | null;
  deathDate?: string | null;
  wikidataUrl?: string | null;
  wikipediaUrl?: string | null;
  translations: AuthorTranslation[];
}

export interface UpdateAuthorRequest extends Partial<CreateAuthorRequest> {}
export type CheckAuthorSlugResponse = {
  exists: boolean;
  existingAuthor?: { id: string; slug: string };
};
