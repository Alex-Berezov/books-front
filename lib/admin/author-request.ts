import {
  factsFromForm,
  photoCreditFromForm,
  unnamedLanguages,
} from '@/lib/admin/author-form-state';
import {
  AUTHOR_BLOCK_KEYS,
  type AuthorBlockKey,
  type AuthorDataIssue,
} from '@/lib/admin/author-page-blocks';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { isAbsoluteHttpUrl } from '@/lib/utils/http-url';
import type { AuthorFormValues, AuthorTranslationForm } from '@/lib/admin/author-form-state';
import type { AuthorBlockValues } from '@/lib/admin/author-page-blocks.schema';
import type { AuthorValidation } from '@/lib/admin/load-author-validation';
import type { AuthorTranslation, CreateAuthorRequest, SeoData } from '@/types/api-schema';

/**
 * Тело `POST /admin/authors` и `PUT /admin/authors/{id}` из значений формы автора (F02-2) —
 * чистая функция по образцу `buildVersionRequest` у формы книги. Проверки на `zod` приходят
 * параметром `checker` (модуль грузится лениво, `load-author-validation.ts`): здесь только
 * типы, чтобы `zod` не попал в запись роутов авторов.
 */

/**
 * Адреса `seo`, у которых в форме есть поле ввода: бэкенд принимает в них только абсолютный
 * http(s) (`UpdateSeoDto`). Ключи без поля в форме не проверяются — иначе сохранение упиралось
 * бы в значение, которое админ не может исправить.
 */
const SEO_URL_KEYS = ['canonicalUrl', 'ogImageUrl'] as const;

/** Ссылки перевода автора: бэкенд отбивает 400 ссылку не на `http(s)` (`LEGACY-447`). */
const LINK_KEYS = ['wikidataUrl', 'wikipediaUrl', 'photoUrl'] as const;

/** Служебные колонки `Seo` из ответа: в запись не уходят. */
const EXCLUDED_SEO_KEYS = ['id', 'createdAt', 'updatedAt', 'seoId', 'authorTranslationId'];

export type AuthorChecker = Pick<
  AuthorValidation,
  'applyBlockText' | 'checkAuthorFacts' | 'checkAuthorPhotoCredit'
>;

export type AuthorRequestResult =
  /** Первая ошибка, на которой форма останавливается сразу (как и раньше). */
  | { kind: 'error'; message: string }
  /** Ошибки данных блоков, фактов и подписи — по всем языкам списком. */
  | { kind: 'issues'; issues: AuthorDataIssue[] }
  | { kind: 'ok'; payload: CreateAuthorRequest };

type TranslationResult =
  | { kind: 'error'; message: string }
  | { kind: 'ok'; translation: AuthorTranslation; issues: AuthorDataIssue[] };

const buildTranslation = (
  langKey: SupportedLang,
  transData: AuthorTranslationForm,
  checker: AuthorChecker
): TranslationResult => {
  const LANG = langKey.toUpperCase();
  if (!transData.slug.trim()) {
    return { kind: 'error', message: `Slug is required for language ${LANG}` };
  }

  const seoData: Record<string, string | number> = {};
  Object.entries(transData.seo).forEach(([k, v]) => {
    if (!EXCLUDED_SEO_KEYS.includes(k) && v !== undefined && v !== null && v !== '') {
      seoData[k] = v;
    }
  });

  const badUrlKey = SEO_URL_KEYS.find(
    (k) => typeof seoData[k] === 'string' && !isAbsoluteHttpUrl(seoData[k] as string)
  );
  if (badUrlKey) {
    return { kind: 'error', message: `SEO ${badUrlKey} must be an absolute http(s) URL (${LANG})` };
  }

  // Ссылку не на `http(s)` бэкенд отбил бы 400 — называем поле до запроса.
  const badLinkKey = LINK_KEYS.find((k) => {
    const raw: unknown = transData[k];
    // JSON-импорт кладёт значение как есть: не строка — тоже негодная ссылка.
    if (raw != null && typeof raw !== 'string') return true;
    const value = raw?.trim();
    return !!value && !isAbsoluteHttpUrl(value);
  });
  if (badLinkKey) {
    return { kind: 'error', message: `${badLinkKey} must be an absolute http(s) URL (${LANG})` };
  }

  const issues: AuthorDataIssue[] = [];
  // Каждый блок проверяется по тексту редактора заново: так ловится и ошибка, которую
  // владелец ещё правит, и старые данные, не проходящие схему. Блок с ошибкой не
  // сохраняется — отправить прежнее значение молча значило бы потерять правку.
  const blocks = {} as AuthorBlockValues;
  for (const key of AUTHOR_BLOCK_KEYS) {
    const result = checker.applyBlockText(key, transData.drafts[key].text, langKey);
    if ('value' in result) (blocks as Record<AuthorBlockKey, unknown>)[key] = result.value;
    else issues.push(...result.issues);
  }

  const rawFacts = factsFromForm(transData.facts);
  const factsCheck = rawFacts ? checker.checkAuthorFacts(rawFacts, langKey) : null;
  if (factsCheck) issues.push(...factsCheck.errors);

  const translation: AuthorTranslation = {
    language: langKey,
    slug: transData.slug.trim(),
    name: transData.name.trim(),
    biography: transData.biography.trim() || null,
    wikidataUrl: transData.wikidataUrl.trim() || null,
    wikipediaUrl: transData.wikipediaUrl.trim() || null,
    photoUrl: (typeof transData.photoUrl === 'string' && transData.photoUrl.trim()) || null,
    faq: transData.faq.filter((f) => f.question.trim() && f.answer.trim()) || [],
    similarSlugs: transData.similarSlugs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    tagline: transData.tagline.trim() || null,
    facts: factsCheck?.data ?? null,
    seo: Object.keys(seoData).length > 0 ? (seoData as unknown as SeoData) : undefined,
  };
  // Каждый блок — в теле всегда, очищенный — явным `null`: отсутствующий ключ бэкенд
  // трактует как «не трогать» и оставил бы прежнее значение, которое владелец стёр.
  for (const key of AUTHOR_BLOCK_KEYS) {
    (translation as unknown as Record<AuthorBlockKey, unknown>)[key] = blocks[key] ?? null;
  }
  return { kind: 'ok', translation, issues };
};

/**
 * `existingLangs` — языки, на которых у автора уже есть перевод. Такой перевод с пустым именем —
 * отказ, а не пропуск: перевод, не попавший в запрос, бэкенд удаляет вместе с адресом страницы.
 */
export const buildAuthorRequest = (
  values: AuthorFormValues,
  existingLangs: ReadonlySet<SupportedLang>,
  checker: AuthorChecker
): AuthorRequestResult => {
  const issues: AuthorDataIssue[] = [];
  const translations: AuthorTranslation[] = [];

  const unnamed = unnamedLanguages(values.translations).filter((lang) => !existingLangs.has(lang));
  if (unnamed.length > 0) {
    return {
      kind: 'error',
      message: `These languages have data but no name, so their translation would not be created: ${unnamed
        .map((lang) => lang.toUpperCase())
        .join(', ')}. Fill in the name and slug, or clear the data`,
    };
  }

  for (const langKey of SUPPORTED_LANGS) {
    const transData = values.translations[langKey];
    if (!transData.name.trim()) {
      if (existingLangs.has(langKey)) {
        return {
          kind: 'error',
          message: `Name is required for language ${langKey.toUpperCase()}: without it the translation and its page would be deleted`,
        };
      }
      continue;
    }
    const result = buildTranslation(langKey, transData, checker);
    if (result.kind === 'error') return result;
    translations.push(result.translation);
    issues.push(...result.issues);
  }

  if (translations.length === 0) {
    return { kind: 'error', message: 'At least one translation with a name is required' };
  }

  const { general } = values;
  const rawCredit = photoCreditFromForm(general.photoCredit);
  const creditCheck = rawCredit ? checker.checkAuthorPhotoCredit(rawCredit) : null;
  if (creditCheck) issues.push(...creditCheck.errors);

  if (issues.length > 0) return { kind: 'issues', issues };

  return {
    kind: 'ok',
    payload: {
      birthDate: general.birthDate || null,
      deathDate: general.deathDate || null,
      nativeName: general.nativeName.trim() || null,
      photoCredit: creditCheck?.data ?? null,
      translations,
    },
  };
};
