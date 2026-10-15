import type { BookCardModel } from './books';
import type { SupportedLang, UUID } from './common';
import type { SeoData } from './pages';

export interface AuthorQuote {
  text: string;
  source?: string;
  /** Слаг книги сайта, из которой цитата (F02-2); `null`/пусто — нет. */
  bookSlug?: string | null;
}

export interface AuthorFaq {
  question: string;
  answer: string;
}

/*
 * Блоки страницы автора (F02-2) — форма записи и админского ответа:
 * `books/src/modules/author/dto/author-page-blocks.dto.ts`. Необязательное листовое поле
 * принимает `null` («нет значения»); пустой блок бэкенд хранит как `null`.
 */

export type AuthorGender = 'male' | 'female';

export type AuthorAdaptationKind = 'film' | 'series' | 'animation' | 'play' | 'opera' | 'other';

/** Подпись к портрету, одна на все языки (`AuthorPhotoCreditDto`). */
export interface AuthorPhotoCredit {
  author: string;
  license: string;
  licenseUrl?: string | null;
  sourceUrl?: string | null;
}

export interface AuthorFacts {
  gender?: AuthorGender | null;
  birthPlace?: string | null;
  deathPlace?: string | null;
  nationality?: string | null;
  occupations?: string[];
  movements?: string[];
  genres?: string[];
  languages?: string[];
  pseudonyms?: string[];
}

export interface AuthorNotableWork {
  title: string;
  year?: number | null;
  bookSlug?: string | null;
}

export interface AuthorStartHere {
  bookSlug: string;
  reason: string;
}

export interface AuthorTimelineEvent {
  year: number;
  text: string;
  bookSlug?: string | null;
}

export interface AuthorInfluenceRef {
  name: string;
  authorSlug?: string | null;
}

export interface AuthorInfluences {
  influencedBy?: AuthorInfluenceRef[];
  influenced?: AuthorInfluenceRef[];
}

export interface AuthorAward {
  name: string;
  year?: number | null;
  nomination?: boolean | null;
}

export interface AuthorAdaptation {
  title: string;
  year?: number | null;
  kind: AuthorAdaptationKind;
  basedOn?: string | null;
  bookSlug?: string | null;
}

export interface AuthorFunFact {
  text: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface AuthorSource {
  title: string;
  url: string;
}

/**
 * Перевод автора: тело записи (`AuthorTranslationDto`) и админский ответ
 * (`AuthorTranslationResponseDto`). `null` у блока верхнего уровня на записи — очистить.
 */
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
  tagline?: string | null;
  facts?: AuthorFacts | null;
  notableWorks?: AuthorNotableWork[] | null;
  startHere?: AuthorStartHere[] | null;
  timeline?: AuthorTimelineEvent[] | null;
  influences?: AuthorInfluences | null;
  awards?: AuthorAward[] | null;
  adaptations?: AuthorAdaptation[] | null;
  funFacts?: AuthorFunFact[] | null;
  sources?: AuthorSource[] | null;
  /** Только в ответе: последнее изменение содержимого перевода. */
  updatedAt?: string;
  seo?: SeoData | null;
}

export interface Author {
  id: UUID;
  /**
   * Корневой слаг подставляет только `AuthorService.toAuthorItem` (список и карточка):
   * у модели `Author` такой колонки нет, слаг живёт на переводе. `POST /admin/authors`
   * и `PUT /admin/authors/{id}` возвращают строку модели и слага не отдают.
   */
  slug?: string;
  birthDate?: string | null;
  deathDate?: string | null;
  /** Полное имя на родном языке автора (F02-2). */
  nativeName?: string | null;
  photoCredit?: AuthorPhotoCredit | null;
  translations?: AuthorTranslation[];
  booksCount?: number;
}

/** Слаг из данных автора, который страница покажет без ссылки (`AuthorSlugWarningDto`). */
export interface AuthorSlugWarning {
  lang: SupportedLang;
  /** Путь в данных перевода, например `startHere[0].bookSlug`. */
  path: string;
  slug: string;
}

/**
 * Ответ `POST /admin/authors` и `PUT /admin/authors/{id}` (`AuthorSaveResponseDto`).
 * `warnings: null` — проверка слагов не удалась, а не «всё найдено». Необязательно:
 * бэкенд до F02-2 поля не отдаёт.
 */
export interface AuthorSaveResponse extends Author {
  warnings?: AuthorSlugWarning[] | null;
}

/** Автор на одном языке в «Вводных для промпта» (`AuthorPromptNameDto`). */
export interface AuthorPromptName {
  lang: SupportedLang;
  name: string;
  slug: string;
}

export interface AuthorPromptBook {
  title: string;
  slug: string;
  firstPublishedYear: number | null;
  hasAudio: boolean;
}

export interface AuthorPromptBooks {
  lang: SupportedLang;
  items: AuthorPromptBook[];
  /** Опубликованных книг на языке; больше `items.length`, когда список обрезан. */
  total: number;
}

/** Ответ `GET /admin/authors/{id}/prompt-inputs` (`AuthorPromptInputsResponseDto`). */
export interface AuthorPromptInputs {
  id: UUID;
  birthDate: string | null;
  deathDate: string | null;
  names: AuthorPromptName[];
  books: AuthorPromptBooks[];
  authors: { names: AuthorPromptName[] }[];
  /** Список авторов упёрся в предел строк и неполон. */
  authorsTruncated: boolean;
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
  quotes?: PublicAuthorQuote[] | null;
  faq?: AuthorFaq[] | null;
  seo?: SeoData | null;
  /*
   * Блоки страницы автора (F02-2, `public-author-page-blocks.dto.ts`). Бэкенд отдаёт их всегда:
   * пустой блок — `[]` или `null`; выкат строго бэкенд → фронт. Слаги из данных приходят
   * разрешёнными в карточку или ссылку на языке страницы, либо `null` — тогда текст без ссылки.
   */
  nativeName: string | null;
  photoCredit: PublicAuthorPhotoCredit | null;
  tagline: string | null;
  facts: PublicAuthorFacts | null;
  /** По году, без года в конце. */
  notableWorks: PublicAuthorNotableWork[];
  /** В порядке ввода; книги, которых нет на сайте, отброшены. */
  startHere: PublicAuthorStartHere[];
  /** По году. */
  timeline: PublicAuthorTimelineEvent[];
  influences: PublicAuthorInfluences | null;
  awards: PublicAuthorAward[];
  adaptations: PublicAuthorAdaptation[];
  funFacts: AuthorFunFact[];
  sources: AuthorSource[];
  /** Последнее изменение содержимого перевода. */
  updatedAt: string;
  /**
   * Похожие авторы: слаг ищется на любом языке и приводится к переводу на языке страницы.
   * `slug: null` — перевода на этот язык нет, имя показывается текстом без ссылки.
   */
  similarAuthors: PublicSimilarAuthor[];
  /**
   * Переводы автора для `hreflang`; `indexable` — опубликованных книг на языке больше нуля,
   * то же правило, что у карты сайта. Необязательно: ответ бэкенда до F02-1 поля не несёт.
   */
  alternates?: PublicAuthorAlternate[];
  /** Опубликованных книг автора на языке — отдельным счётом. До F02-1 поля нет. */
  booksTotal?: number;
  /** Есть ли аудио у любой книги автора на языке — по всем книгам, не по `books`. До F02-3 поля нет. */
  booksHasAudio?: boolean;
  /** Среднее средних оценок книг автора на языке; `null` — оценок нет. До F02-3 поля нет. */
  booksAvgRating?: number | null;
  /**
   * Первые 12 книг автора (F02-3): общая карточка (`BookCard`) плюс год; порядок — по году,
   * без года в конце. Остальные — `/{lang}/authors/{slug}/books/cards` тем же порядком.
   */
  books: PublicAuthorBook[];
}

/** Похожий автор (`PublicSimilarAuthorDto`); портрет и даты — с F02-2. */
export interface PublicSimilarAuthor {
  name: string;
  slug: string | null;
  photoUrl?: string | null;
  /** `YYYY-MM-DD` или `YYYY`. */
  birthDate?: string | null;
  deathDate?: string | null;
}

/** Книга сайта из данных автора на языке страницы (`PublicAuthorPageBookDto`). */
export interface PublicAuthorPageBook {
  slug: string;
  title: string;
  coverUrl: string;
}

/** Автор сайта из `influences` со ссылкой на языке страницы (`PublicAuthorPageAuthorLinkDto`). */
export interface PublicAuthorPageAuthorLink {
  slug: string;
  name: string;
}

export interface PublicAuthorPhotoCredit {
  author: string;
  license: string;
  licenseUrl?: string;
  sourceUrl?: string;
}

export interface PublicAuthorFacts {
  gender?: AuthorGender;
  birthPlace?: string;
  deathPlace?: string;
  nationality?: string;
  occupations?: string[];
  movements?: string[];
  genres?: string[];
  languages?: string[];
  pseudonyms?: string[];
}

export interface PublicAuthorNotableWork {
  title: string;
  year?: number;
  bookSlug?: string;
  book: PublicAuthorPageBook | null;
}

export interface PublicAuthorStartHere {
  bookSlug: string;
  reason: string;
  book: PublicAuthorPageBook;
}

export interface PublicAuthorTimelineEvent {
  year: number;
  text: string;
  bookSlug?: string;
  book: PublicAuthorPageBook | null;
}

export interface PublicAuthorInfluenceRef {
  name: string;
  authorSlug?: string;
  author: PublicAuthorPageAuthorLink | null;
}

export interface PublicAuthorInfluences {
  influencedBy: PublicAuthorInfluenceRef[];
  influenced: PublicAuthorInfluenceRef[];
}

export interface PublicAuthorAward {
  name: string;
  year?: number;
  nomination?: boolean;
}

export interface PublicAuthorAdaptation {
  title: string;
  year?: number;
  kind: AuthorAdaptationKind;
  basedOn?: string;
  bookSlug?: string;
  book: PublicAuthorPageBook | null;
}

/** Цитата публичной страницы (`PublicAuthorQuoteDto`); `book` — книга сайта или `null`. */
export interface PublicAuthorQuote {
  text: string;
  source?: string;
  bookSlug?: string;
  book: PublicAuthorPageBook | null;
}

/** Перевод автора для кластера `hreflang` (`PublicAuthorAlternateDto`). */
export interface PublicAuthorAlternate {
  lang: SupportedLang;
  slug: string;
  indexable: boolean;
}

/**
 * Книга на странице автора (`PublicAuthorBookDto`): та же карточка, что отдаёт
 * `/{lang}/authors/{slug}/books/cards`, и год первой публикации.
 */
export interface PublicAuthorBook extends BookCardModel {
  firstPublishedYear: number | null;
}

export interface CreateAuthorRequest {
  birthDate?: string | null;
  deathDate?: string | null;
  /** `null`/пусто — очистить (F02-2). */
  nativeName?: string | null;
  /** `null` — очистить; `author` и `license` обязательны при наличии объекта. */
  photoCredit?: AuthorPhotoCredit | null;
  translations: AuthorTranslation[];
}

export interface UpdateAuthorRequest extends Partial<CreateAuthorRequest> {}
export type CheckAuthorSlugResponse = {
  exists: boolean;
  suggestedSlug?: string;
  existingAuthor?: { id: string; slug: string };
};
