'use client';

import { forwardRef } from 'react';
import { Select as AntSelect } from 'antd';
import type { SelectProps } from './Select.types';
import type { RefSelectProps } from 'antd/es/select';
import styles from './Select.module.scss';

/**
 * Select - Wrapper over antd Select with extended API
 *
 * Features:
 * - Sizes: sm, md, lg
 * - Error state for validation
 * - Loading state
 * - Full width support
 * - Single, multiple, and tags modes
 * - Search functionality
 * - Integration with react-hook-form via Controller
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Select
 *   options={[
 *     { label: 'Option 1', value: '1' },
 *     { label: 'Option 2', value: '2' },
 *   ]}
 *   placeholder="Select an option"
 * />
 *
 * // With react-hook-form
 * <Controller
 *   name="category"
 *   control={control}
 *   render={({ field, fieldState }) => (
 *     <Select
 *       {...field}
 *       options={categories}
 *       error={!!fieldState.error}
 *       placeholder="Select category"
 *     />
 *   )}
 * />
 *
 * // Multiple selection with search
 * <Select
 *   mode="multiple"
 *   showSearch
 *   options={tags}
 *   placeholder="Select tags"
 * />
 *
 * // Full width with error state
 * <Select
 *   fullWidth
 *   error={!!errors.language}
 *   options={languages}
 *   placeholder="Select language"
 * />
 * ```
 */
export const Select = forwardRef<RefSelectProps, SelectProps>((props, ref) => {
  const {
    size = 'md',
    fullWidth = false,
    error = false,
    loading = false,
    disabled = false,
    placeholder,
    options,
    value,
    defaultValue,
    onChange,
    onBlur,
    allowClear = false,
    showSearch = false,
    mode = 'single',
    ariaLabel,
    className,
    name,
    autoFocus = false,
    popupRender,
    filterOption,
    maxTagCount,
    getPopupContainer,
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

  // Map our mode to antd mode
  const getAntdMode = (): 'multiple' | 'tags' | undefined => {
    switch (mode) {
      case 'multiple':
        return 'multiple';
      case 'tags':
        return 'tags';
      case 'single':
      default:
        return undefined;
    }
  };

  // Build class names
  const classNames = [
    styles.select,
    fullWidth && styles.fullWidth,
    error && styles.error,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Default filter option for search
  const defaultFilterOption = (
    input: string,
    option?: { label?: React.ReactNode; value?: string }
  ) => {
    if (!option?.label) return false;
    const labelText = typeof option.label === 'string' ? option.label : String(option.label);
    return labelText.toLowerCase().includes(input.toLowerCase());
  };

  return (
    <AntSelect
      ref={ref}
      size={getAntdSize()}
      mode={getAntdMode()}
      loading={loading}
      disabled={disabled}
      placeholder={placeholder}
      options={options}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      allowClear={allowClear}
      showSearch={showSearch}
      className={classNames}
      aria-label={ariaLabel}
      id={name}
      autoFocus={autoFocus}
      popupRender={popupRender}
      filterOption={filterOption ?? (showSearch ? defaultFilterOption : undefined)}
      maxTagCount={maxTagCount}
      getPopupContainer={getPopupContainer}
      status={error ? 'error' : undefined}
      style={fullWidth ? { width: '100%' } : undefined}
    />
  );
});

Select.displayName = 'Select';
