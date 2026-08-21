import type { BookFormData } from './BookForm.types';
import type {
  BookVersionDetail,
  CreateBookVersionRequest,
  UpdateBookVersionRequest,
} from '@/types/api-schema';

/**
 * Сборка тел запросов из данных формы версии книги.
 *
 * Вынесено из страниц по двум причинам. Первая: тела собирались двумя почти одинаковыми
 * копиями — в создании версии и в её правке, — и различие между ними (пустое поле
 * не отправляется против пустое поле очищает) читалось только при сличении файлов.
 * Вторая: внутри страниц эта сборка не проверяется ничем, а именно в ней живёт разница
 * между «редактор очистил описание» и «редактор его не трогал».
 */

/** SEO уходит отдельной ручкой (`PUT /versions/:id/seo`), в теле версии его нет. */
export const buildVersionSeoPayload = (data: BookFormData): Record<string, string> => {
  const seo: Record<string, string> = {};
  if (data.seoMetaTitle) seo.metaTitle = data.seoMetaTitle;
  if (data.seoMetaDescription) seo.metaDescription = data.seoMetaDescription;
  if (data.seoCanonicalUrl) seo.canonicalUrl = data.seoCanonicalUrl;
  if (data.seoRobots) seo.robots = data.seoRobots;
  if (data.seoOgTitle) seo.ogTitle = data.seoOgTitle;
  if (data.seoOgDescription) seo.ogDescription = data.seoOgDescription;
  if (data.seoOgImageUrl) seo.ogImageUrl = data.seoOgImageUrl;
  if (data.seoTwitterCard) seo.twitterCard = data.seoTwitterCard;
  if (data.seoOgImageAlt) seo.ogImageAlt = data.seoOgImageAlt;
  return seo;
};

/** Поля, одинаковые у создания и правки. */
const buildCommonFields = (data: BookFormData) => ({
  title: data.title,
  author: data.author,
  type: data.type,
  isFree: data.isFree,
  referralUrl: data.referralUrl || undefined,
  primaryCategoryId: data.primaryCategoryId || null,
  firstPublishedYear: data.firstPublishedYear ? Number(data.firstPublishedYear) : null,
  editionPublishedYear: data.editionPublishedYear ? Number(data.editionPublishedYear) : null,
  originalLanguage: data.originalLanguage || null,
  copyrightStatus: data.copyrightStatus || null,
  authorPageUrl: data.authorPageUrl || null,
  characters: data.characters && data.characters.length > 0 ? data.characters : null,
  quotes: data.quotes && data.quotes.length > 0 ? data.quotes : null,
  faq: data.faq && data.faq.length > 0 ? data.faq : null,
  themes: data.themes && data.themes.length > 0 ? data.themes : null,
  originalTitle: data.originalTitle || null,
  alternativeTitles:
    data.alternativeTitles && data.alternativeTitles.length > 0 ? data.alternativeTitles : null,
  shortDescription: data.shortDescription || null,
  summaryShort: data.summaryShort || null,
  symbols: data.symbols && data.symbols.length > 0 ? data.symbols : null,
  coverAlt: data.coverAlt || null,
});

/**
 * Создание версии: незаполненные описание и обложка не отправляются вовсе — бэкенд сам
 * положит в колонки пустую строку, а версия заведётся черновиком.
 */
export const buildCreateVersionRequest = (data: BookFormData): CreateBookVersionRequest => ({
  language: data.language,
  description: data.description || undefined,
  coverImageUrl: data.coverImageUrl || undefined,
  ...buildCommonFields(data),
});

/**
 * Правка версии: пустая строка отправляется как есть — в черновике это единственный способ
 * очистить поле, и отличить «очистил» от «не трогал» иначе нельзя. Стереть заполненное поле
 * у версии, которая уже выходила наружу, не даст ни форма, ни бэкенд.
 */
export const buildUpdateVersionRequest = (data: BookFormData): UpdateBookVersionRequest => ({
  slug: data.bookSlug,
  description: data.description ?? '',
  coverImageUrl: data.coverImageUrl ?? '',
  ...buildCommonFields(data),
});

/** Перевод одного языка из импортируемого JSON. Форма приходит извне, поля произвольные. */
export interface ImportedTranslation {
  localizedTitle?: string;
  localizedAuthorName?: string;
  description?: string;
  shortDescription?: string;
  coverImageUrl?: string;
  copyrightStatusSuggestion?: string;
  alternativeTitles?: string[];
  summaryShort?: string;
  symbols?: { title: string; description: string }[];
  coverAlt?: string;
  characters?: { name: string; description: string }[];
  quotes?: { text: string; author?: string }[];
  faq?: { question: string; answer: string }[];
  themes?: string[];
}

/**
 * Тело для импорта переводов: цикл идёт по пяти языкам, и часть версий книги может быть уже
 * опубликована. Пустые описание и обложка не отправляются вовсе — пустая строка означала бы
 * стирание живого текста у опубликованной соседки, бэкенд ответил бы 400, и импорт оборвался бы
 * посреди цикла, оставив часть языков обновлёнными, а часть нет.
 */
export const buildImportVersionPayload = (
  translation: ImportedTranslation,
  version: Pick<
    BookVersionDetail,
    'title' | 'author' | 'description' | 'coverImageUrl' | 'copyrightStatus'
  >
) => ({
  title: translation.localizedTitle || version.title,
  author: translation.localizedAuthorName || version.author,
  description:
    translation.description || translation.shortDescription || version.description || undefined,
  coverImageUrl: translation.coverImageUrl || version.coverImageUrl || undefined,
  copyrightStatus: translation.copyrightStatusSuggestion || version.copyrightStatus || null,
  alternativeTitles: translation.alternativeTitles || null,
  shortDescription: translation.shortDescription || null,
  summaryShort: translation.summaryShort || null,
  symbols: translation.symbols || null,
  coverAlt: translation.coverAlt || null,
  characters: translation.characters || null,
  quotes: translation.quotes || null,
  faq: translation.faq || null,
  themes: translation.themes || null,
});
