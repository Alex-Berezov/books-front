/**
 * React хук для валидации slug с debounce
 *
 * Проверяет уникальность slug через API с задержкой (debounce),
 * чтобы не делать запрос при каждом нажатии клавиши.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { checkBookSlugUniqueness, checkPageSlugUniqueness } from '@/api/endpoints/slug-validation';
import type { SlugValidationResult } from '@/api/endpoints/slug-validation';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Тип сущности для проверки slug
 */
export type SlugEntityType = 'page' | 'book';

/**
 * Статус валидации slug
 */
export type SlugValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

/**
 * Результат хука useSlugValidation
 */
export interface UseSlugValidationResult {
  /** Текущий статус валидации */
  status: SlugValidationStatus;
  /** Является ли slug уникальным (undefined пока проверка не завершена) */
  isUnique?: boolean;
  /** Предлагаемый уникальный slug (если текущий занят) */
  suggestedSlug?: string;
  /** Информация о существующей странице/книге с таким slug */
  existingItem?: {
    id: string;
    title: string;
    status: string;
  };
  /** Функция для ручного запуска проверки */
  validate: (slug: string) => void;
}

/**
 * Параметры хука useSlugValidation
 */
export interface UseSlugValidationParams {
  /** Тип сущности (page | book) */
  entityType: SlugEntityType;
  /** Язык (для pages) */
  lang?: SupportedLang;
  /** ID редактируемой сущности (для исключения из проверки) */
  excludeId?: string;
  /** Задержка debounce в миллисекундах (по умолчанию 500) */
  debounceMs?: number;
  /** Включена ли автоматическая валидация (по умолчанию true) */
  enabled?: boolean;
}

/**
 * React хук для проверки уникальности slug с debounce
 *
 * Автоматически проверяет slug через API с задержкой (debounce),
 * чтобы не делать запрос при каждом нажатии клавиши.
 *
 * @param params - Параметры валидации
 * @returns Результат валидации и функция для ручной проверки
 *
 * @example
 * // В компоненте формы страницы
 * const { status, isUnique, suggestedSlug, validate } = useSlugValidation({
 *   entityType: 'page',
 *   lang: 'en',
 *   excludeId: pageId, // при редактировании
 * });
 *
 * // Вызываем validate при изменении slug
 * useEffect(() => {
 *   if (slug) {
 *     validate(slug);
 *   }
 * }, [slug, validate]);
 *
 * // Показываем статус
 * {status === 'checking' && <Spinner />}
 * {status === 'invalid' && <Alert>Slug занят! Используйте: {suggestedSlug}</Alert>}
 * {status === 'valid' && <CheckIcon />}
 */
export const useSlugValidation = (params: UseSlugValidationParams): UseSlugValidationResult => {
  const { entityType, lang, excludeId, debounceMs = 500, enabled = true } = params;

  const [status, setStatus] = useState<SlugValidationStatus>('idle');
  const [result, setResult] = useState<SlugValidationResult | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  /**
   * Функция для проверки slug через API
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
        // В случае ошибки считаем slug валидным (чтобы не блокировать форму)
        setStatus('valid');
        setResult({ slug, isUnique: true });
      }
    },
    [entityType, lang, excludeId, enabled]
  );

  /**
   * Функция для ручного запуска проверки (с debounce)
   */
  const validate = useCallback(
    (slug: string) => {
      setPendingSlug(slug);
    },
    [setPendingSlug]
  );

  /**
   * Debounce эффект - запускает проверку через заданное время
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
