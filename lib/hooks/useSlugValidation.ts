/**
 * React hook for slug validation with debounce
 *
 * Checks slug uniqueness via API with delay (debounce),
 * to avoid making a request on every keystroke.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkBookSlugUniqueness,
  checkBookVersionSlugUniqueness,
  checkCategorySlugUniqueness,
  checkPageSlugUniqueness,
  checkTagSlugUniqueness,
} from '@/api/endpoints/slug-validation';
import type { SlugValidationResult } from '@/api/endpoints/slug-validation';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Entity type for slug validation
 */
export type SlugEntityType = 'page' | 'book' | 'bookVersion' | 'category' | 'tag';

/**
 * Slug validation status
 */
export type SlugValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'unknown';

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
  /** Slug is claimed by a site route and can never be served (pages only) */
  reserved?: boolean;
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
  /** `bookVersion` only: the version's own book - its slugs lead to the same book */
  ownBookId?: string;
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
  const { entityType, lang, excludeId, ownBookId, debounceMs = 500, enabled = true } = params;

  const [status, setStatus] = useState<SlugValidationStatus>('idle');
  const [result, setResult] = useState<SlugValidationResult | null>(null);
  // Номер последнего запроса: ответ на слаг или язык, который уже сменился, не перетирает
  // вердикт по текущим.
  const latestCheck = useRef(0);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  /**
   * Function to check slug via API
   */
  const checkSlug = useCallback(
    async (slug: string) => {
      const checkId = latestCheck.current;
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
        } else if (entityType === 'bookVersion') {
          // Слаг языковой версии: `excludeId` здесь - id версии, `ownBookId` - её книга.
          if (!lang) {
            throw new Error('Language is required for book version slug validation');
          }
          validationResult = await checkBookVersionSlugUniqueness(slug, lang, {
            versionId: excludeId,
            bookId: ownBookId,
          });
        } else if (entityType === 'category') {
          validationResult = await checkCategorySlugUniqueness(slug, excludeId);
        } else if (entityType === 'tag') {
          // Своё пространство слагов: тег и категория могут законно совпадать по
          // имени, поэтому проверка отдельная (LEGACY-061).
          validationResult = await checkTagSlugUniqueness(slug, excludeId);
        } else {
          // entityType === 'book'
          validationResult = await checkBookSlugUniqueness(slug, excludeId);
        }

        if (checkId !== latestCheck.current) {
          return;
        }
        setResult(validationResult);
        setStatus(
          validationResult.checkFailed ? 'unknown' : validationResult.isUnique ? 'valid' : 'invalid'
        );
      } catch (error) {
        // Synchronous failure before the endpoint call (e.g. missing `lang`).
        // Same rule as the endpoint's own catch (LEGACY-142): unknown, not
        // valid - a check that failed is not a check that passed.
        console.error('[useSlugValidation] Error checking slug:', error);
        if (checkId !== latestCheck.current) {
          return;
        }
        setStatus('unknown');
        setResult({ slug, checkFailed: true });
      }
    },
    [entityType, lang, excludeId, ownBookId, enabled]
  );

  /**
   * Function to manually trigger validation (with debounce)
   */
  const validate = useCallback(
    (slug: string) => {
      // Номер берётся здесь, а не по истечении паузы: ответ на прежний слаг или язык, пришедший
      // во время паузы, уже устарел. Он же гасит прежний вердикт — до ответа идёт проверка.
      latestCheck.current += 1;
      if (slug && enabled) {
        setStatus('checking');
      }
      setPendingSlug(slug);
    },
    [setPendingSlug, enabled]
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
    reserved: result?.reserved,
    validate,
  };
};
