import {
  AUTHOR_BLOCK_KEYS,
  type AuthorBlockKey,
  type AuthorDataIssue,
} from '@/lib/admin/author-page-blocks';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { AuthorBlockValues } from '@/lib/admin/author-page-blocks.schema';
import type {
  AuthorFacts,
  AuthorFaq,
  AuthorGender,
  AuthorPhotoCredit,
  AuthorTranslation,
  SeoData,
} from '@/types/api-schema';

/**
 * Состояние формы автора (`components/admin/authors/AuthorForm`) и чистые переходы над ним:
 * их зовут и форма, и слияние импорта (`author-import.ts`), и тесты.
 */

/**
 * Сводка фактов полями формы (решение арбитра В3). Списки — массивом, по элементу на тег:
 * значение с запятой («Ясная Поляна, Российская империя») не распадается на два.
 */
export interface AuthorFactsForm {
  gender: '' | AuthorGender;
  birthPlace: string;
  deathPlace: string;
  nationality: string;
  occupations: string[];
  movements: string[];
  genres: string[];
  languages: string[];
  pseudonyms: string[];
}

export const FACT_TEXT_KEYS = ['birthPlace', 'deathPlace', 'nationality'] as const;

export const FACT_LIST_KEYS = [
  'occupations',
  'movements',
  'genres',
  'languages',
  'pseudonyms',
] as const;

/**
 * Текст JSON-редактора блока и его ошибки. Пока `issues` не пусты, значение блока в
 * `blocks` остаётся прежним: ошибка разбора не затирает данные, а сохранение стоит.
 */
export interface AuthorBlockDraft {
  text: string;
  issues: AuthorDataIssue[] | null;
  /** Модуль проверки ещё грузится: текст не проверен, сохранять его нельзя. */
  checking?: boolean;
}

export type AuthorBlockDrafts = Record<AuthorBlockKey, AuthorBlockDraft>;

export interface AuthorTranslationForm {
  name: string;
  slug: string;
  biography: string;
  wikidataUrl: string;
  wikipediaUrl: string;
  photoUrl: string | null;
  faq: AuthorFaq[];
  similarSlugs: string;
  seo: Partial<SeoData>;
  tagline: string;
  facts: AuthorFactsForm;
  blocks: AuthorBlockValues;
  drafts: AuthorBlockDrafts;
}

export interface AuthorPhotoCreditForm {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

/** Общие поля автора, одни на все языки. */
export interface AuthorGeneralForm {
  birthDate: string;
  deathDate: string;
  nativeName: string;
  photoCredit: AuthorPhotoCreditForm;
}

export interface AuthorFormValues {
  general: AuthorGeneralForm;
  translations: Record<SupportedLang, AuthorTranslationForm>;
}

export const defaultSeo = (): Partial<SeoData> => ({
  robots: 'index, follow',
  twitterCard: 'summary',
});

export const emptyFactsForm = (): AuthorFactsForm => ({
  gender: '',
  birthPlace: '',
  deathPlace: '',
  nationality: '',
  occupations: [],
  movements: [],
  genres: [],
  languages: [],
  pseudonyms: [],
});

export const emptyBlocks = (): AuthorBlockValues => ({
  notableWorks: null,
  startHere: null,
  timeline: null,
  influences: null,
  awards: null,
  adaptations: null,
  funFacts: null,
  sources: null,
  quotes: null,
});

/** Текст редактора для значения блока: пустой блок — пустое поле. */
export const blockToText = (value: unknown): string =>
  value === null || value === undefined ? '' : JSON.stringify(value, null, 2);

export const draftsFromBlocks = (blocks: AuthorBlockValues): AuthorBlockDrafts =>
  Object.fromEntries(
    AUTHOR_BLOCK_KEYS.map((key) => [key, { text: blockToText(blocks[key]), issues: null }])
  ) as AuthorBlockDrafts;

export const emptyTranslationForm = (): AuthorTranslationForm => {
  const blocks = emptyBlocks();
  return {
    name: '',
    slug: '',
    biography: '',
    wikidataUrl: '',
    wikipediaUrl: '',
    photoUrl: null,
    faq: [],
    similarSlugs: '',
    seo: defaultSeo(),
    tagline: '',
    facts: emptyFactsForm(),
    blocks,
    drafts: draftsFromBlocks(blocks),
  };
};

export const emptyPhotoCreditForm = (): AuthorPhotoCreditForm => ({
  author: '',
  license: '',
  licenseUrl: '',
  sourceUrl: '',
});

export const emptyAuthorForm = (): AuthorFormValues => ({
  general: { birthDate: '', deathDate: '', nativeName: '', photoCredit: emptyPhotoCreditForm() },
  translations: Object.fromEntries(
    SUPPORTED_LANGS.map((lang) => [lang, emptyTranslationForm()])
  ) as Record<SupportedLang, AuthorTranslationForm>,
});

export const factsToForm = (facts: AuthorFacts | null | undefined): AuthorFactsForm => {
  const form = emptyFactsForm();
  if (!facts) return form;
  form.gender = facts.gender ?? '';
  for (const key of FACT_TEXT_KEYS) form[key] = facts[key] ?? '';
  for (const key of FACT_LIST_KEYS) form[key] = [...(facts[key] ?? [])];
  return form;
};

const cleanList = (items: readonly string[]): string[] =>
  items.map((item) => item.trim()).filter(Boolean);

/** Факты для записи; все поля пусты — `null` (блока нет). */
export const factsFromForm = (form: AuthorFactsForm): AuthorFacts | null => {
  const facts: AuthorFacts = {};
  if (form.gender) facts.gender = form.gender;
  for (const key of FACT_TEXT_KEYS) {
    const value = form[key].trim();
    if (value) facts[key] = value;
  }
  for (const key of FACT_LIST_KEYS) {
    const list = cleanList(form[key]);
    if (list.length > 0) facts[key] = list;
  }
  return Object.keys(facts).length > 0 ? facts : null;
};

export const photoCreditToForm = (
  credit: AuthorPhotoCredit | null | undefined
): AuthorPhotoCreditForm => ({
  author: credit?.author ?? '',
  license: credit?.license ?? '',
  licenseUrl: credit?.licenseUrl ?? '',
  sourceUrl: credit?.sourceUrl ?? '',
});

/** Подпись для записи; все четыре поля пусты — `null`. Проверка формы — `checkAuthorPhotoCredit`. */
export const photoCreditFromForm = (form: AuthorPhotoCreditForm): AuthorPhotoCredit | null => {
  const credit = {
    author: form.author.trim(),
    license: form.license.trim(),
    licenseUrl: form.licenseUrl.trim(),
    sourceUrl: form.sourceUrl.trim(),
  };
  if (Object.values(credit).every((value) => value === '')) return null;
  return {
    author: credit.author,
    license: credit.license,
    ...(credit.licenseUrl ? { licenseUrl: credit.licenseUrl } : {}),
    ...(credit.sourceUrl ? { sourceUrl: credit.sourceUrl } : {}),
  };
};

/**
 * Перевод из ответа бэкенда в поля формы. Старый автор: блоков нет (`null`), у цитат нет
 * `bookSlug`. Цитату без текста форма и раньше не отправляла (`handleSave`), поэтому она не
 * попадает в редактор — иначе старый автор открывался бы с ошибкой, которую не он внёс.
 */
export const translationToForm = (t: AuthorTranslation): AuthorTranslationForm => {
  const quotes = (t.quotes ?? []).filter((q) => typeof q?.text === 'string' && q.text.trim());
  const blocks = emptyBlocks();
  // Значения как пришли с бэкенда: проверка схемой (и приведение) — при правке и сохранении,
  // модуль схемы грузится лениво (`load-author-validation.ts`).
  for (const key of AUTHOR_BLOCK_KEYS) {
    const raw = key === 'quotes' ? (quotes.length > 0 ? quotes : null) : (t[key] ?? null);
    (blocks as Record<AuthorBlockKey, unknown>)[key] = raw;
  }
  const drafts = draftsFromBlocks(blocks);
  return {
    name: t.name,
    slug: t.slug,
    biography: t.biography || '',
    wikidataUrl: t.wikidataUrl || '',
    wikipediaUrl: t.wikipediaUrl || '',
    photoUrl: t.photoUrl || null,
    faq: t.faq || [],
    similarSlugs: (t.similarSlugs || []).join(', '),
    seo: { ...defaultSeo(), ...t.seo },
    tagline: t.tagline || '',
    facts: factsToForm(t.facts),
    blocks,
    drafts,
  };
};

export const isEmptyBlockValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.values(value).every(isEmptyBlockValue);
  return false;
};

/**
 * Смена портрета (решение арбитра В6): портрет один на все языки и в `seo.ogImageUrl`
 * больше не копируется — запасной og подставляет страница. `ogImageUrl`, равный прежнему
 * портрету (копия старого поведения), очищается; выставленный вручную не трогается.
 */
export const applyPhotoChange = (
  translations: Record<SupportedLang, AuthorTranslationForm>,
  newPhotoUrl: string | null
): Record<SupportedLang, AuthorTranslationForm> => {
  const updated = { ...translations };
  for (const lang of SUPPORTED_LANGS) {
    const current = translations[lang];
    const previousPhoto = current.photoUrl;
    const ogIsPhotoCopy = !!previousPhoto && current.seo.ogImageUrl === previousPhoto;
    updated[lang] = {
      ...current,
      photoUrl: newPhotoUrl,
      seo: ogIsPhotoCopy ? { ...current.seo, ogImageUrl: '' } : current.seo,
    };
  }
  return updated;
};

/**
 * У перевода есть данные, кроме общих на все языки (портрет) и служебных (`seo`, который
 * форма заполняет сама). По нему видно язык, где владелец что-то ввёл или импортировал.
 */
export const hasTranslationData = (form: AuthorTranslationForm): boolean =>
  [form.slug, form.tagline, form.wikidataUrl, form.wikipediaUrl].some(
    (value) => value.trim() !== ''
  ) ||
  // Пустой редактор отдаёт разметку без текста (`<p></p>`) — это не данные.
  form.biography.replace(/<[^>]*>/g, '').trim() !== '' ||
  form.similarSlugs.split(',').some((slug) => slug.trim() !== '') ||
  form.faq.some((item) => item.question.trim() !== '' || item.answer.trim() !== '') ||
  factsFromForm(form.facts) !== null ||
  AUTHOR_BLOCK_KEYS.some((key) => blockTextHasData(form.drafts[key].text));

/**
 * Текст JSON-редактора блока — данные, если в нём не пусто и не пустое значение (`[]`, `null`,
 * `{}`): такой блок форма отправит `null`, то есть с языка ничего бы не ушло. Неразбираемый
 * текст — данные: владелец что-то ввёл, и молча потерять это нельзя.
 */
const blockTextHasData = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed === '') return false;
  try {
    return !isEmptyBlockValue(JSON.parse(trimmed));
  } catch {
    return true;
  }
};

/**
 * Языки, где данные есть, а имени нет: такой перевод форма не отправит, а значит и не
 * создаст. Молча пропустить его нельзя — владелец увидел бы «сохранено» и потерял данные.
 */
export const unnamedLanguages = (
  translations: Record<SupportedLang, AuthorTranslationForm>
): SupportedLang[] =>
  SUPPORTED_LANGS.filter(
    (lang) => !translations[lang].name.trim() && hasTranslationData(translations[lang])
  );
