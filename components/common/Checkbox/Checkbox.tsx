'use client';

import { forwardRef, useEffect, useRef } from 'react';
import type { CheckboxProps } from './Checkbox.types';
import styles from './Checkbox.module.scss';

/**
 * Checkbox - Custom styled checkbox component
 *
 * Features:
 * - Sizes: sm, md, lg
 * - Error state for validation
 * - Indeterminate state (for "select all" functionality)
 * - Label with placement options (start/end)
 * - Controlled and uncontrolled modes
 * - Integration with react-hook-form via register or Controller
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Checkbox label="Accept terms" onChange={(e) => console.log(e.target.checked)} />
 *
 * // With react-hook-form register (simple)
 * <Checkbox label="This version is free" {...register('isFree')} />
 *
 * // With react-hook-form Controller (full control)
 * <Controller
 *   name="acceptTerms"
 *   control={control}
 *   render={({ field }) => (
 *     <Checkbox
 *       {...field}
 *       checked={field.value}
 *       label="I accept the terms"
 *       error={!!errors.acceptTerms}
 *     />
 *   )}
 * />
 *
 * // Indeterminate state (for "select all")
 * <Checkbox
 *   indeterminate={someChecked && !allChecked}
 *   checked={allChecked}
 *   onChange={handleSelectAll}
 *   label="Select all"
 * />
 *
 * // With label at start
 * <Checkbox label="Enable feature" labelPlacement="start" />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => {
  const {
    checked,
    defaultChecked,
    indeterminate = false,
    size = 'md',
    disabled = false,
    error = false,
    label,
    labelPlacement = 'end',
    onChange,
    onBlur,
    ariaLabel,
    name,
    id,
    value,
    className,
  } = props;

  // Internal ref for indeterminate state
  const internalRef = useRef<HTMLInputElement>(null);

  // Merge refs
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

  // Handle indeterminate state (can only be set via JavaScript)
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.indeterminate = indeterminate;
    }
  }, [indeterminate, inputRef]);

  // Build wrapper class names
  const wrapperClassNames = [
    styles.wrapper,
    styles[`size-${size}`],
    disabled && styles.disabled,
    error && styles.error,
    labelPlacement === 'start' && styles.labelStart,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const checkboxElement = (
    <span className={styles.checkboxWrapper}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
        name={name}
        id={id ?? name}
        value={value}
        className={styles.input}
        aria-label={!label ? ariaLabel : undefined}
        aria-invalid={error}
      />
      <span className={styles.checkbox} />
      {/* Checkmark icon */}
      <svg
        className={styles.checkmark}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {/* Indeterminate icon (minus) */}
      <svg
        className={styles.indeterminate}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </span>
  );

  // If no label, return just the checkbox
  if (!label) {
    return <span className={wrapperClassNames}>{checkboxElement}</span>;
  }

  // With label, wrap in label element
  return (
    <label className={wrapperClassNames} htmlFor={id ?? name}>
      {labelPlacement === 'start' && <span className={styles.label}>{label}</span>}
      {checkboxElement}
      {labelPlacement === 'end' && <span className={styles.label}>{label}</span>}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
