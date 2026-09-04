import { z } from 'zod';
import type { PublicationStatus } from '@/types/api-schema';

/**
 * Validation schema for book version form.
 *
 * Сырая схема — `bookVersionBaseSchema`, и запрещать что-либо она не умеет: рабочую схему формы
 * собирает `buildBookVersionSchema`. Отдать резолверу сырую — значит потерять запрет на стирание
 * описания и обложки у опубликованной версии, и ни типы, ни тесты этого не покажут.
 *
 * Черновик сохраняется с любым наполнением: описание и обложка — работа на несколько заходов,
 * и требовать их в момент сохранения значило запрещать сохранять вообще. Полнота спрашивается
 * там, где она и нужна, — на публикации: её держит блокер гейта `VERSION_CONTENT_INCOMPLETE`
 * на бэкенде. Отдельно форма не даёт стереть описание и обложку у уже опубликованной версии —
 * см. `buildBookVersionSchema` ниже.
 */
export const bookVersionBaseSchema = z.object({
  /** Book slug (URL identifier) */
  bookSlug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  /** Book version language */
  language: z.enum(['en', 'es', 'fr', 'pt', 'ru']),
  /** Book title */
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  /** Book author */
  // 500 — тот же потолок, что у `@MaxLength(500)` в `create/update-book-version.dto.ts`
  // на бэкенде (`LEGACY-354`). Прежняя сотня была строже контракта: имя длиной
  // 150 знаков ручка принимала, а форма отбивала, и дотянуться до настоящей
  // границы из админки было нельзя.
  author: z.string().min(1, 'Author is required').max(500, 'Author name is too long'),
  /** Book description: required only for a published version */
  description: z.string(),
  /** Cover image URL: required only for a published version */
  coverImageUrl: z.url('Invalid URL').or(z.literal('')),
  /** Version type */
  type: z.enum(['text', 'audio', 'referral']),
  /** Whether version is free */
  isFree: z.boolean(),
  /** URL for referral links */
  referralUrl: z.url('Invalid URL').optional().or(z.literal('')),
  /** ID основной категории книги для хлебных крошек */
  primaryCategoryId: z.uuid('Invalid UUID').nullable().optional().or(z.literal('')),

  // ========================================
  // SEO Fields (matching PageForm structure)
  // ========================================

  // Basic Meta Tags
  /** SEO meta title - will be sent as seo.metaTitle */
  seoMetaTitle: z.string().max(60, 'Meta Title should be 50-60 characters'),
  /** SEO meta description - will be sent as seo.metaDescription */
  seoMetaDescription: z.string().max(160, 'Meta Description should be 120-160 characters'),

  // Technical SEO
  /** Canonical URL to avoid duplicate content */
  seoCanonicalUrl: z.string(),
  /** Robots meta tag for indexing control */
  seoRobots: z.string(),

  // Open Graph (Facebook, LinkedIn)
  /** OG title for social media */
  seoOgTitle: z.string().max(60, 'OG Title is too long'),
  /** OG description for social media */
  seoOgDescription: z.string().max(160, 'OG Description is too long'),
  /** OG image URL (1200x630 recommended) */
  seoOgImageUrl: z.string(),

  // Twitter Card
  /** Twitter card type */
  seoTwitterCard: z.enum(['summary', 'summary_large_image', '']),

  /** First published year */
  firstPublishedYear: z
    .preprocess(
      (val) => {
        if (val === '' || val === undefined || val === null) return '';
        const num = Number(val);
        return isNaN(num) ? '' : num;
      },
      z.union([z.number().int().min(1).max(2100), z.literal(''), z.null()])
    )
    .optional(),
  /** Edition published year */
  editionPublishedYear: z
    .preprocess(
      (val) => {
        if (val === '' || val === undefined || val === null) return '';
        const num = Number(val);
        return isNaN(num) ? '' : num;
      },
      z.union([z.number().int().min(1).max(2100), z.literal(''), z.null()])
    )
    .optional(),
  originalLanguage: z.string().optional().or(z.literal('')),
  copyrightStatus: z.string().optional().or(z.literal('')),
  authorPageUrl: z.string().optional().or(z.literal('')),
  authorId: z.string().optional().or(z.literal('')),
  characters: z.array(z.object({ name: z.string(), description: z.string() })).optional(),
  quotes: z
    .array(z.object({ text: z.string(), author: z.string().optional().or(z.literal('')) }))
    .optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  themes: z.array(z.string()).optional(),
  originalTitle: z.string().optional().or(z.literal('')),
  alternativeTitles: z.array(z.string()).optional(),
  shortDescription: z
    .string()
    .max(300, 'Short description is too long')
    .optional()
    .or(z.literal('')),
  summaryShort: z.string().max(2000, 'Summary is too long').optional().or(z.literal('')),
  symbols: z.array(z.object({ title: z.string(), description: z.string() })).optional(),
  coverAlt: z.string().max(200, 'Cover alt is too long').optional().or(z.literal('')),
  seoOgImageAlt: z.string().max(200, 'OG image alt is too long').optional().or(z.literal('')),
});

/**
 * Какие поля запрещено оставлять пустыми в этой конкретной форме.
 *
 * Требование повторяет бэкенд, чтобы редактор увидел причину под полем, а не общий текст
 * ошибки в тосте. Кто именно попадает под запрет, решает `requiredContentFieldsFor`.
 */
export interface RequiredContentFields {
  description: boolean;
  coverImageUrl: boolean;
}

/**
 * Заполнено — значит в значении есть текст. Описание пишется в визуальном редакторе, поэтому
 * `<p></p>` и `<p>&nbsp;</p>` — это пустое описание, хотя строка непустая: читателю такая
 * карточка покажется без текста, а редактору форма иначе запрещала бы сохранение, пока он
 * не сочинит описание вместо пустого абзаца.
 *
 * Парная проверка на бэкенде — `isVersionContentFieldFilled` в
 * `books/src/modules/book-version/publication-gate.constants.ts`; правится вместе с этой.
 */
const isFilled = (value: string | null | undefined): boolean =>
  typeof value === 'string' &&
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .trim() !== '';

/**
 * Что нельзя оставить пустым в форме этой версии.
 *
 * Черновик и создание новой версии не ограничены ничем. Всё, что не черновик, — ограничено
 * ровно теми полями, которые в версии уже заполнены: стереть их нельзя, а заполнить пустые
 * форма не требует, иначе у старой карточки с пустым описанием нельзя было бы поправить
 * ни слаг, ни SEO. Ровно так же считает `BookVersionService.update` на бэкенде.
 */
export const requiredContentFieldsFor = (version?: {
  status?: PublicationStatus;
  description?: string | null;
  coverImageUrl?: string | null;
}): RequiredContentFields => {
  // Версии нет — идёт создание, ограничивать нечего. А вот неизвестный статус попадает
  // в строгую ветку: не пришедший с сервера статус не должен молча снимать запрет.
  if (!version) return { description: false, coverImageUrl: false };
  if (version.status === 'draft') {
    return { description: false, coverImageUrl: false };
  }

  return {
    description: isFilled(version.description),
    coverImageUrl: isFilled(version.coverImageUrl),
  };
};

export const buildBookVersionSchema = (required: RequiredContentFields) =>
  bookVersionBaseSchema.superRefine((data, ctx) => {
    if (required.description && !isFilled(data.description)) {
      ctx.addIssue({
        code: 'custom',
        path: ['description'],
        message: 'A published version cannot be left without a description',
      });
    }
    if (required.coverImageUrl && !isFilled(data.coverImageUrl)) {
      ctx.addIssue({
        code: 'custom',
        path: ['coverImageUrl'],
        message: 'A published version cannot be left without a cover image',
      });
    }
  });
