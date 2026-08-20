import type { BookFormData } from './BookForm.types';
import type { FieldErrors } from 'react-hook-form';

/**
 * Human-readable names of form fields.
 *
 * Used by the invalid-submit summary: react-hook-form reports the field name,
 * and `seoOgImageAlt` tells the editor nothing about where to look.
 */
export const BOOK_FORM_FIELD_LABELS: Record<string, string> = {
  bookSlug: 'Slug',
  language: 'Language',
  title: 'Title',
  author: 'Author',
  description: 'Description',
  coverImageUrl: 'Cover image URL',
  coverAlt: 'Cover alt text',
  type: 'Version type',
  isFree: 'Free access',
  referralUrl: 'Referral URL',
  primaryCategoryId: 'Primary category',
  firstPublishedYear: 'First published year',
  editionPublishedYear: 'Edition published year',
  originalLanguage: 'Original language',
  originalTitle: 'Original title',
  alternativeTitles: 'Alternative titles',
  copyrightStatus: 'Copyright status',
  authorPageUrl: 'Author page URL',
  authorId: 'Author',
  shortDescription: 'Short description',
  summaryShort: 'Short summary',
  characters: 'Characters',
  quotes: 'Quotes',
  faq: 'FAQ',
  themes: 'Themes',
  symbols: 'Symbols',
  seoMetaTitle: 'SEO: Meta Title',
  seoMetaDescription: 'SEO: Meta Description',
  seoCanonicalUrl: 'SEO: Canonical URL',
  seoRobots: 'SEO: Robots',
  seoOgTitle: 'SEO: OG Title',
  seoOgDescription: 'SEO: OG Description',
  seoOgImageUrl: 'SEO: OG Image URL',
  seoOgImageAlt: 'SEO: OG Image Alt',
  seoTwitterCard: 'SEO: Twitter Card',
};

export interface FormFieldIssue {
  /** Field name as registered in react-hook-form */
  name: string;
  /** Human-readable field name */
  label: string;
  /** Validation message */
  message: string;
}

/** Digs the first validation message out of a nested error node (arrays, objects). */
const firstMessage = (node: unknown): string | null => {
  if (!node || typeof node !== 'object') return null;

  const message = (node as { message?: unknown }).message;
  if (typeof message === 'string' && message.length > 0) return message;

  for (const value of Object.values(node as Record<string, unknown>)) {
    const nested = firstMessage(value);
    if (nested) return nested;
  }
  return null;
};

/**
 * Flattens react-hook-form errors into a flat list for the summary block.
 *
 * Errors of fields that have no visible input (array items, SEO fields inside
 * collapsed sections) are the reason a submit used to fail with no sign at all.
 */
export const collectFormIssues = (errors: FieldErrors<BookFormData>): FormFieldIssue[] =>
  Object.entries(errors).reduce<FormFieldIssue[]>((issues, [name, error]) => {
    const message = firstMessage(error);
    if (!message) return issues;

    issues.push({ name, label: BOOK_FORM_FIELD_LABELS[name] || name, message });
    return issues;
  }, []);
