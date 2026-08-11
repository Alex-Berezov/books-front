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
import { isReservedSlug } from '@/lib/constants/reserved-slugs';
import { useSlugValidation } from '@/lib/hooks/useSlugValidation';
import { generateSlug, isValidSlug } from '@/lib/utils/slug';
import type { SlugInputProps } from './SlugInput.types';
import styles from './SlugInput.module.scss';
import { DuplicateWarning } from './ui/DuplicateWarning';
import { GenerateButton } from './ui/GenerateButton';
import { ReservedWarning } from './ui/ReservedWarning';
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
 *   mode={initialData ? 'edit' : 'create'}
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
    mode,
    onChange,
    placeholder = 'about-us',
    showGenerateButton = true,
    sourceValue,
    value,
  } = props;

  /**
   * Editing an existing record never regenerates the slug, because that slug is
   * already a live URL. `mode` says so outright rather than being inferred: the
   * original guard tried to deduce it by watching `value` and `sourceValue`
   * become populated *in the same render*, which is a race — a form that
   * hydrated the title one render before the slug left the guard disarmed and
   * the next effect rewrote the slug from the title. That is how the homepage's
   * `homepage-index` became `homepage`, silently, on an ordinary save.
   *
   * Typing in the field locks generation for the rest of a create session; the
   * lock is released when the same mounted form switches to another record
   * (modals are reused rather than remounted).
   */
  const [wasManuallyEdited, setWasManuallyEdited] = useState(false);
  const [modeOfLock, setModeOfLock] = useState(mode);
  if (modeOfLock !== mode) {
    setModeOfLock(mode);
    setWasManuallyEdited(false);
  }
  const autoGenerationLocked = mode === 'edit' || wasManuallyEdited;

  // Hook for slug uniqueness check
  const { existingItem, isUnique, reserved, status, suggestedSlug, validate } = useSlugValidation({
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
    // - the form is editing an existing record, or the slug was typed by hand
    // - no sourceValue
    if (!autoGenerate || autoGenerationLocked || !sourceValue) {
      return;
    }

    const generatedSlug = generateSlug(sourceValue);

    // Update only if generated slug differs from current
    if (generatedSlug !== value) {
      onChange(generatedSlug);
    }
  }, [sourceValue, autoGenerate, autoGenerationLocked, value, onChange]);

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

  /**
   * Only page slugs can be reserved. Everything else is served under a prefix
   * (`/:lang/book/:slug`), so a book called `catalog` collides with nothing — and
   * the backend refuses the slug for pages only. Warning more widely than it
   * enforces would block a legitimate name for no reason.
   *
   * The local half exists because the API client fails open on error
   * (`isUnique: true`) so as not to block the form: right for a uniqueness
   * question, which only the database can answer, but reservation is answerable
   * here, and staying silent would leave the editor to find out from a 400.
   *
   * It runs in create mode only. A page that already sits on a reserved slug is
   * grandfathered by the backend — it may be saved as-is, and it is reachable
   * through the admin — so a local check blind to that would warn the owner
   * about a slug the API accepts, with no way to dismiss it. In edit mode the
   * API is the authority: it knows which page is asking, and this component
   * does not.
   */
  const isReserved =
    entityType === 'page' && (reserved === true || (mode === 'create' && isReservedSlug(value)));

  // Determine whether to show duplication
  const showDuplicateWarning = !error && !isReserved && isUnique === false && existingItem;

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
      {!error && !existingItem && !isReserved && <ValidationHint placeholder={placeholder} />}

      {/* Validation error from react-hook-form */}
      {error && <span className={styles.error}>{error}</span>}

      {/* Warning about a slug the router owns */}
      {!error && isReserved && (
        <ReservedWarning
          slug={value}
          suggestedSlug={suggestedSlug}
          onUseSuggested={handleUseSuggested}
        />
      )}

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
