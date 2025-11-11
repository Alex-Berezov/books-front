/**
 * Reusable component for slug input
 *
 * Features:
 * - Automatically generate slug from sourceValue (usually title)
 * - Check slug uniqueness via API with debounce
 * - Show validation status (checking, unique, taken)
 * - Suggest alternative slug if current is taken
 * - Warn about duplicates with information about existing page
 */

'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, FC, FocusEvent } from 'react';
import { useSlugValidation } from '@/lib/hooks/useSlugValidation';
import { generateSlug, isValidSlug } from '@/lib/utils/slug';
import type { SlugInputProps } from './SlugInput.types';
import styles from './SlugInput.module.scss';
import { DuplicateWarning } from './ui/DuplicateWarning';
import { GenerateButton } from './ui/GenerateButton';
import { StatusIcon } from './ui/StatusIcon';
import { ValidationHint } from './ui/ValidationHint';

/**
 * Component for slug input with auto-generation and uniqueness check
 *
 * @example
 * // In page form with react-hook-form
 * <SlugInput
 *   value={watch('slug')}
 *   onChange={(slug) => setValue('slug', slug)}
 *   sourceValue={watch('title')}
 *   entityType="page"
 *   lang="en"
 *   autoGenerate
 *   showGenerateButton
 * />
 */
export const SlugInput: FC<SlugInputProps> = (props) => {
  const {
    autoGenerate = true,
    className,
    disabled = false,
    entityType,
    error,
    excludeId,
    id = 'slug',
    lang,
    onChange,
    placeholder = 'about-us',
    showGenerateButton = true,
    sourceValue,
    value,
  } = props;

  // State: was slug manually edited by user
  const [wasManuallyEdited, setWasManuallyEdited] = useState(false);

  // Hook for slug uniqueness check
  const { existingItem, isUnique, status, suggestedSlug, validate } = useSlugValidation({
    entityType,
    lang,
    excludeId,
    enabled: !disabled,
  });

  /**
   * Auto-generate slug when sourceValue (title) changes
   */
  useEffect(() => {
    // Don't auto-generate if:
    // - autoGenerate is disabled
    // - slug was manually edited
    // - no sourceValue
    if (!autoGenerate || wasManuallyEdited || !sourceValue) {
      return;
    }

    const generatedSlug = generateSlug(sourceValue);

    // Update only if generated slug differs from current
    if (generatedSlug !== value) {
      onChange(generatedSlug);
    }
  }, [sourceValue, autoGenerate, wasManuallyEdited, value, onChange]);

  /**
   * Check uniqueness when slug changes
   */
  useEffect(() => {
    if (value && isValidSlug(value)) {
      validate(value);
    }
  }, [value, validate]);

  /**
   * Handle manual slug change
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Convert to lowercase and remove invalid characters on the fly
    const sanitizedValue = newValue
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-'); // Remove multiple hyphens

    onChange(sanitizedValue);

    // Mark that slug was manually edited
    if (!wasManuallyEdited) {
      setWasManuallyEdited(true);
    }
  };

  /**
   * Handle blur (remove hyphens at start/end)
   */
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.replace(/^-+|-+$/g, '');
    if (trimmedValue !== e.target.value) {
      onChange(trimmedValue);
    }
  };

  /**
   * Generate slug from sourceValue on button click
   */
  const handleGenerateClick = () => {
    if (!sourceValue) {
      return;
    }

    const generatedSlug = generateSlug(sourceValue);
    onChange(generatedSlug);
    setWasManuallyEdited(false); // Reset manual edit flag
  };

  /**
   * Apply suggested slug
   */
  const handleUseSuggested = () => {
    if (suggestedSlug) {
      onChange(suggestedSlug);
    }
  };

  /**
   * Determine CSS class for status
   */
  const getStatusClass = (): string => {
    if (error) return styles.invalid;
    if (!value) return '';
    if (status === 'checking') return styles.checking;
    if (status === 'valid') return styles.valid;
    if (status === 'invalid') return styles.invalid;
    return '';
  };

  // Determine whether to show duplication
  const showDuplicateWarning = !error && isUnique === false && existingItem;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Main input field */}
      <div className={styles.inputWrapper}>
        <input
          className={`${styles.input} ${getStatusClass()}`}
          disabled={disabled}
          id={id}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder={placeholder}
          type="text"
          value={value}
        />

        {/* Status icon */}
        {!disabled && value && <StatusIcon status={status} />}

        {/* Slug generation button */}
        {showGenerateButton && !disabled && (
          <GenerateButton hasSourceValue={!!sourceValue} onClick={handleGenerateClick} />
        )}
      </div>

      {/* Hint: URL-friendly format */}
      {!error && !existingItem && <ValidationHint placeholder={placeholder} />}

      {/* Validation error from react-hook-form */}
      {error && <span className={styles.error}>{error}</span>}

      {/* Warning about non-unique slug */}
      {showDuplicateWarning && (
        <DuplicateWarning
          entityType={entityType}
          slug={value}
          existingItem={existingItem}
          suggestedSlug={suggestedSlug}
          onUseSuggested={handleUseSuggested}
        />
      )}
    </div>
  );
};
