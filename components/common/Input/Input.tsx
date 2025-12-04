'use client';

import { forwardRef, useState, type ChangeEvent, type FocusEvent } from 'react';
import type { InputProps } from './Input.types';
import styles from './Input.module.scss';

/**
 * Input - Custom styled input component
 *
 * Features:
 * - Sizes: sm, md, lg
 * - Error state for validation
 * - Loading state with spinner
 * - Full width support
 * - Password type with visibility toggle
 * - Character count
 * - Integration with react-hook-form via register or Controller
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Input placeholder="Enter text" />
 *
 * // With react-hook-form register (simple)
 * <Input {...register('email')} error={!!errors.email} placeholder="Email" />
 *
 * // With react-hook-form Controller (full control)
 * <Controller
 *   name="email"
 *   control={control}
 *   render={({ field, fieldState }) => (
 *     <Input
 *       {...field}
 *       error={!!fieldState.error}
 *       placeholder="Email"
 *     />
 *   )}
 * />
 *
 * // Password with toggle
 * <Input type="password" placeholder="Password" />
 *
 * // Full width with max length
 * <Input fullWidth maxLength={100} showCount placeholder="Description" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    size = 'md',
    fullWidth = false,
    error = false,
    disabled = false,
    loading = false,
    placeholder,
    value,
    defaultValue,
    onChange,
    onBlur,
    type = 'text',
    allowClear = false,
    maxLength,
    showCount = false,
    ariaLabel,
    className,
    name,
    id,
    autoFocus = false,
    autoComplete,
  } = props;

  const [showPassword, setShowPassword] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  // Track current value for showCount feature
  const currentValue = value !== undefined ? value : internalValue;

  // Handle internal value tracking for uncontrolled mode
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  // Handle clear button
  const handleClear = () => {
    const syntheticEvent = {
      target: { value: '', name },
      currentTarget: { value: '', name },
    } as ChangeEvent<HTMLInputElement>;

    if (value === undefined) {
      setInternalValue('');
    }
    onChange?.(syntheticEvent);
  };

  // Build class names
  const classNames = [
    styles.inputWrapper,
    styles[`size-${size}`],
    fullWidth && styles.fullWidth,
    error && styles.error,
    disabled && styles.disabled,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={classNames}>
      <input
        ref={ref}
        type={inputType}
        disabled={disabled || loading}
        placeholder={placeholder}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={handleChange}
        onBlur={onBlur as (e: FocusEvent<HTMLInputElement>) => void}
        maxLength={maxLength}
        className={styles.input}
        aria-label={ariaLabel}
        id={id ?? name}
        name={name}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        aria-invalid={error}
      />

      {/* Clear button */}
      {allowClear && currentValue && !disabled && !loading && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="Clear input"
        >
          ×
        </button>
      )}

      {/* Password toggle */}
      {type === 'password' && (
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </button>
      )}

      {/* Loading spinner */}
      {loading && <span className={styles.spinner} />}

      {/* Character count */}
      {showCount && maxLength && (
        <span className={styles.charCount}>
          {String(currentValue).length}/{maxLength}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
