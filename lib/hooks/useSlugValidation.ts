/**
 * React hook for slug validation with debounce
 *
 * Checks slug uniqueness via API with delay (debounce),
 * to avoid making a request on every keystroke.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { checkBookSlugUniqueness, checkPageSlugUniqueness } from '@/api/endpoints/slug-validation';
import type { SlugValidationResult } from '@/api/endpoints/slug-validation';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Entity type for slug validation
 */
export type SlugEntityType = 'page' | 'book';

/**
 * Slug validation status
 */
export type SlugValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

/**
 * useSlugValidation hook result
 */
export interface UseSlugValidationResult {
  /** Current validation status */
  status: SlugValidationStatus;
  /** Whether slug is unique (undefined until validation is complete) */
  isUnique?: boolean;
  /** Suggested unique slug (if current is taken) */
  suggestedSlug?: string;
  /** Information about existing page/book with this slug */
  existingItem?: {
    id: string;
    title: string;
    status: string;
  };
  /** Function to manually trigger validation */
  validate: (slug: string) => void;
}

/**
 * useSlugValidation hook parameters
 */
export interface UseSlugValidationParams {
  /** Entity type (page | book) */
  entityType: SlugEntityType;
  /** Language (for pages) */
  lang?: SupportedLang;
  /** ID of entity being edited (to exclude from validation) */
  excludeId?: string;
  /** Debounce delay in milliseconds (default 500) */
  debounceMs?: number;
  /** Whether automatic validation is enabled (default true) */
  enabled?: boolean;
}

/**
 * React hook for slug uniqueness validation with debounce
 *
 * Automatically checks slug via API with delay (debounce),
 * to avoid making a request on every keystroke.
 *
 * @param params - Validation parameters
 * @returns Validation result and function for manual validation
 *
 * @example
 * // In page form component
 * const { status, isUnique, suggestedSlug, validate } = useSlugValidation({
 *   entityType: 'page',
 *   lang: 'en',
 *   excludeId: pageId, // when editing
 * });
 *
 * // Call validate when slug changes
 * useEffect(() => {
 *   if (slug) {
 *     validate(slug);
 *   }
 * }, [slug, validate]);
 *
 * // Show status
 * {status === 'checking' && <Spinner />}
 * {status === 'invalid' && <Alert>Slug is taken! Use: {suggestedSlug}</Alert>}
 * {status === 'valid' && <CheckIcon />}
 */
export const useSlugValidation = (params: UseSlugValidationParams): UseSlugValidationResult => {
  const { entityType, lang, excludeId, debounceMs = 500, enabled = true } = params;

  const [status, setStatus] = useState<SlugValidationStatus>('idle');
  const [result, setResult] = useState<SlugValidationResult | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  /**
   * Function to check slug via API
   */
  const checkSlug = useCallback(
    async (slug: string) => {
      if (!slug || !enabled) {
        setStatus('idle');
        setResult(null);
        return;
      }

      setStatus('checking');

      try {
        let validationResult: SlugValidationResult;

        if (entityType === 'page') {
          if (!lang) {
            throw new Error('Language is required for page slug validation');
          }
          validationResult = await checkPageSlugUniqueness(slug, lang, excludeId);
        } else {
          // entityType === 'book'
          validationResult = await checkBookSlugUniqueness(slug, excludeId);
        }

        setResult(validationResult);
        setStatus(validationResult.isUnique ? 'valid' : 'invalid');
      } catch (error) {
        console.error('[useSlugValidation] Error checking slug:', error);
        // In case of error, consider slug valid (to not block the form)
        setStatus('valid');
        setResult({ slug, isUnique: true });
      }
    },
    [entityType, lang, excludeId, enabled]
  );

  /**
   * Function to manually trigger validation (with debounce)
   */
  const validate = useCallback(
    (slug: string) => {
      setPendingSlug(slug);
    },
    [setPendingSlug]
  );

  /**
   * Debounce effect - triggers validation after specified time
   */
  useEffect(() => {
    if (!pendingSlug) {
      return;
    }

    const timeoutId = setTimeout(() => {
      checkSlug(pendingSlug);
      setPendingSlug(null);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pendingSlug, debounceMs, checkSlug]);

  return {
    status,
    isUnique: result?.isUnique,
    suggestedSlug: result?.suggestedSlug,
    existingItem: result?.existingPage,
    validate,
  };
};
