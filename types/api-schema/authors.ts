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

/**
 * Языковая альтернатива автора в списочном ответе.
 *
 * 🔴 Не `AuthorTranslation`. Полный перевод — это биография, `quotes`, `faq`,
 * `similarSlugs` и вложенный `Seo`, и раньше публичный список отдавал их
 * анониму на каждого автора и на каждый язык (`LEGACY-214`). Отдельный тип
 * держит состав честным: расширится ответ — расширять придётся и это.
 *
 * Три поля, и каждое кем-то читается. `slug` — потому что корневой слаг списка
 * английский, и ссылка на `/ru/author/<корневой>` даёт 404. `name` — потому что
 * подписи под портретами на главной берутся отсюда (`getAuthorDisplayName`),
 * и без него они станут пустыми строками.
 */
export interface AuthorListTranslation {
  language: SupportedLang;
  slug: string;
  name: string;
}

export interface AuthorListItem {
  id: UUID;
  slug: string;
  /**
   * Имя на языке пути. Бэкенд отдаёт его с 09.08.2026, а в этом типе поля
   * не было — рукописная схема проверяла сама себя (урок `L-011`).
   */
  name: string;
  birthDate?: string | null;
  deathDate?: string | null;
  photoUrl?: string | null;
  /** Первые ~160 знаков биографии без разметки. Считает сервер, не браузер. */
  shortBio?: string | null;
  translations?: AuthorListTranslation[];
  booksCount: number;
  /** Опубликованные аудиокниги на языке пути. */
  audioCount?: number;
}

/** Буква алфавитного указателя и число авторов под ней. */
export interface AuthorLetter {
  letter: string;
  count: number;
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
