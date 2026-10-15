import {
  applyPhotoChange,
  blockToText,
  defaultSeo,
  factsFromForm,
  factsToForm,
  isEmptyBlockValue,
  photoCreditFromForm,
  photoCreditToForm,
  type AuthorFormValues,
  type AuthorTranslationForm,
} from '@/lib/admin/author-form-state';
import { AUTHOR_BLOCK_KEYS, type AuthorDataIssue } from '@/lib/admin/author-page-blocks';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { authorUrl } from '@/lib/seo/author-page';
import type {
  AuthorImportData,
  AuthorTranslationImport,
} from '@/lib/admin/author-page-blocks.schema';
import type { SeoData } from '@/types/api-schema';

/**
 * Импорт JSON в форму автора — слияние по T5 (`tech.md` §0): ключа нет — поле не трогается;
 * ключ есть со значением `null` или `[]` (у строки верхнего уровня — и `''`) — поле
 * очищается; иначе значение заменяет прежнее, блок — целиком. Так сливаются два JSON на одного
 * автора: данные (промпт № 1) и биография (промпт № 2), в любом порядке.
 *
 * Вход — уже проверенный `checkAuthorImport` (без неизвестных ключей). Модуль без `zod`:
 * проверка и разбор окна импорта — `author-validation.ts`, он грузится лениво.
 */

const has = <T extends object>(source: T, key: keyof T): boolean =>
  Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined;

/**
 * Имя и слаг импорт пустым значением не очищает: перевод без имени форма не отправляет,
 * и бэкенд удалил бы его вместе с адресом страницы. Остальные строки — по T5.
 */
const REQUIRED_TEXT_KEYS = ['name', 'slug'] as const;

const TEXT_KEYS = ['biography', 'wikidataUrl', 'wikipediaUrl', 'tagline'] as const;

const isFilled = (value: unknown) => value !== undefined && value !== null && value !== '';

const mergeSeo = (
  prev: AuthorTranslationForm,
  t: AuthorTranslationImport,
  lang: SupportedLang
): Partial<SeoData> => {
  const incoming = t.seo ?? {};
  // Вложенный ключ `seo` со значением `null`/`''` прежнее не перетирает: шаблон промпта всегда
  // шлёт `"ogImageUrl": null`, и повторный импорт стирал бы og, выставленный вручную.
  // Очищает `seo` целиком только `"seo": null` (T5, поле верхнего уровня).
  const filled = Object.fromEntries(
    Object.entries(incoming).filter(([, value]) => isFilled(value))
  ) as Partial<SeoData>;
  const base: Partial<SeoData> = t.seo === null ? defaultSeo() : { ...prev.seo, ...filled };
  // `ogImageUrl` берётся только из самого `seo` JSON: портрет туда больше не копируется (В6).
  return {
    ...base,
    ogTitle: incoming.ogTitle || incoming.metaTitle || t.metaTitle || base.ogTitle || '',
    ogDescription:
      incoming.ogDescription ||
      incoming.metaDescription ||
      t.metaDescription ||
      base.ogDescription ||
      '',
    canonicalUrl:
      incoming.canonicalUrl || (t.slug ? authorUrl(lang, t.slug) : base.canonicalUrl || ''),
  };
};

const mergeTranslation = (
  prev: AuthorTranslationForm,
  t: AuthorTranslationImport,
  lang: SupportedLang
): AuthorTranslationForm => {
  const next: AuthorTranslationForm = {
    ...prev,
    blocks: { ...prev.blocks },
    drafts: { ...prev.drafts },
  };
  for (const key of REQUIRED_TEXT_KEYS) {
    if (isFilled(t[key])) next[key] = t[key] as string;
  }
  for (const key of TEXT_KEYS) {
    if (has(t, key)) next[key] = t[key] ?? '';
  }
  if (has(t, 'facts')) next.facts = factsToForm(t.facts);
  for (const key of AUTHOR_BLOCK_KEYS) {
    if (!has(t, key)) continue;
    const value = isEmptyBlockValue(t[key]) ? null : t[key];
    (next.blocks as Record<string, unknown>)[key] = value;
    next.drafts[key] = { text: blockToText(value), issues: null };
  }
  if (has(t, 'faq')) next.faq = t.faq ?? [];
  if (has(t, 'similarSlugs')) {
    next.similarSlugs = Array.isArray(t.similarSlugs)
      ? t.similarSlugs.join(', ')
      : (t.similarSlugs ?? '');
  }
  next.seo = mergeSeo(prev, t, lang);
  return next;
};

/** Слияние проверенного JSON импорта с текущими значениями формы. Языки вне JSON не трогаются. */
export const mergeAuthorImport = (
  prev: AuthorFormValues,
  data: AuthorImportData
): AuthorFormValues => {
  const general = { ...prev.general };
  if (has(data, 'birthDate')) general.birthDate = data.birthDate ?? '';
  if (has(data, 'deathDate')) general.deathDate = data.deathDate ?? '';
  if (has(data, 'nativeName')) general.nativeName = data.nativeName ?? '';
  if (has(data, 'photoCredit')) general.photoCredit = photoCreditToForm(data.photoCredit);

  let translations = { ...prev.translations };
  for (const lang of SUPPORTED_LANGS) {
    const incoming = data.translations[lang];
    if (incoming) translations[lang] = mergeTranslation(prev.translations[lang], incoming, lang);
  }

  // `photoUrl` в JSON — обратная совместимость: портрет один на все языки, и пустое значение
  // его не стирает — ставит и снимает портрет владелец через `MediaPicker` (`tech.md` §3).
  const photo = SUPPORTED_LANGS.map((lang) => data.translations[lang]?.photoUrl).find(Boolean);
  if (photo) translations = applyPhotoChange(translations, photo);

  return { general, translations };
};

/** Поле, которое импорт очистит: `lang: null` — общее поле автора. */
export interface ClearedField {
  lang: SupportedLang | null;
  field: string;
}

const isBlankText = (value: string | null | undefined) => !value || value.trim() === '';

/** Служебные колонки `Seo` из ответа бэкенда: их владелец не заполняет. */
const SEO_SERVICE_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'seoId']);

const hasSeoValues = (seo: Partial<SeoData>) => {
  const defaults = defaultSeo() as Record<string, unknown>;
  return Object.entries(seo).some(
    ([key, value]) =>
      !SEO_SERVICE_KEYS.has(key) &&
      value !== undefined &&
      value !== null &&
      value !== '' &&
      value !== defaults[key]
  );
};

/**
 * Непустые поля верхнего уровня, которые JSON очищает (`null`, `[]`, `''`) — список
 * «будут очищены» в окне импорта до применения (решение арбитра В7). Не блокирует импорт.
 */
export const collectClearedFields = (
  prev: AuthorFormValues,
  data: AuthorImportData
): ClearedField[] => {
  const cleared: ClearedField[] = [];
  const general = prev.general;
  for (const key of ['birthDate', 'deathDate', 'nativeName'] as const) {
    if (has(data, key) && isBlankText(data[key]) && !isBlankText(general[key])) {
      cleared.push({ lang: null, field: key });
    }
  }
  if (
    has(data, 'photoCredit') &&
    data.photoCredit === null &&
    photoCreditFromForm(general.photoCredit) !== null
  ) {
    cleared.push({ lang: null, field: 'photoCredit' });
  }

  for (const lang of SUPPORTED_LANGS) {
    const t = data.translations[lang];
    if (!t) continue;
    const before = prev.translations[lang];
    for (const key of TEXT_KEYS) {
      if (has(t, key) && isBlankText(t[key]) && !isBlankText(before[key])) {
        cleared.push({ lang, field: key });
      }
    }
    if (
      has(t, 'facts') &&
      factsFromForm(factsToForm(t.facts)) === null &&
      factsFromForm(before.facts) !== null
    ) {
      cleared.push({ lang, field: 'facts' });
    }
    for (const key of AUTHOR_BLOCK_KEYS) {
      if (has(t, key) && isEmptyBlockValue(t[key]) && !isEmptyBlockValue(before.blocks[key])) {
        cleared.push({ lang, field: key });
      }
    }
    if (has(t, 'faq') && (t.faq ?? []).length === 0 && before.faq.length > 0) {
      cleared.push({ lang, field: 'faq' });
    }
    if (has(t, 'similarSlugs')) {
      const incoming = Array.isArray(t.similarSlugs) ? t.similarSlugs.join('') : t.similarSlugs;
      if (isBlankText(incoming) && !isBlankText(before.similarSlugs)) {
        cleared.push({ lang, field: 'similarSlugs' });
      }
    }
    if (has(t, 'seo') && t.seo === null && hasSeoValues(before.seo)) {
      cleared.push({ lang, field: 'seo' });
    }
  }
  return cleared;
};

/** Разбор текста окна импорта до применения: ошибки, неизвестные ключи и «будут очищены». */
export interface AuthorImportAnalysis {
  /** Готовые к слиянию данные; `null` — импорт не применяется. */
  data: AuthorImportData | null;
  errors: AuthorDataIssue[];
  unknownKeys: AuthorDataIssue[];
  cleared: ClearedField[];
  /** Языки, где после импорта будут данные, но не будет имени: перевод не создастся. */
  unnamed: SupportedLang[];
}
