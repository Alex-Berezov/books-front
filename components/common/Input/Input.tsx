'use client';

import { forwardRef } from 'react';
import { Input as AntInput } from 'antd';
import type { InputProps } from './Input.types';
import type { InputRef } from 'antd';
import styles from './Input.module.scss';

/**
 * Input - Wrapper over antd Input with extended API
 *
 * Features:
 * - Sizes: sm, md, lg
 * - Error state for validation
 * - Loading state with spinner
 * - Full width support
 * - Password type with visibility toggle
 * - Prefix/suffix icons
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
 * // With prefix icon
 * <Input prefix={<SearchIcon />} placeholder="Search..." />
 *
 * // Full width with max length
 * <Input fullWidth maxLength={100} showCount placeholder="Description" />
 * ```
 */
export const Input = forwardRef<InputRef, InputProps>((props, ref) => {
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
    prefix,
    suffix,
    allowClear = false,
    maxLength,
    showCount = false,
    ariaLabel,
    className,
    name,
    autoFocus = false,
    autoComplete,
  } = props;

  // Map our sizes to antd sizes
  const getAntdSize = () => {
    switch (size) {
      case 'sm':
        return 'small' as const;
      case 'lg':
        return 'large' as const;
      case 'md':
      default:
        return 'middle' as const;
    }
  };

  // Build class names
  const classNames = [styles.input, fullWidth && styles.fullWidth, error && styles.error, className]
    .filter(Boolean)
    .join(' ');

  // Common props for all input types
  const commonProps = {
    ref,
    size: getAntdSize(),
    disabled: disabled || loading,
    placeholder,
    value,
    defaultValue,
    onChange,
    onBlur,
    prefix,
    suffix: loading ? <span className={styles.spinner} /> : suffix,
    allowClear,
    maxLength,
    showCount,
    className: classNames,
    'aria-label': ariaLabel,
    id: name,
    name,
    autoFocus,
    autoComplete,
    status: error ? ('error' as const) : undefined,
    style: fullWidth ? { width: '100%' } : undefined,
  };

  // Use Password component for password type
  if (type === 'password') {
    return <AntInput.Password {...commonProps} />;
  }

  // Use regular Input for other types
  return <AntInput {...commonProps} type={type} />;
});

Input.displayName = 'Input';
