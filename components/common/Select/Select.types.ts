import type { ReactNode, ReactElement } from 'react';

/**
 * Select size options
 */
export type SelectSize = 'sm' | 'md' | 'lg';

/**
 * Select mode options
 */
export type SelectMode = 'single' | 'multiple' | 'tags';

/**
 * Select option type
 */
export interface SelectOption<T = string> {
  /**
   * Display label (can be string or ReactNode for custom rendering)
   */
  label: ReactNode;

  /**
   * Option value
   */
  value: T;

  /**
   * Whether the option is disabled
   */
  disabled?: boolean;
}

/**
 * Select component props
 *
 * Wrapper over antd Select with extended API for project consistency
 */
export interface SelectProps<T = string> {
  /**
   * Size of the select
   * @default 'md'
   */
  size?: SelectSize;

  /**
   * Whether the select should take full width of container
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Error state for validation
   * @default false
   */
  error?: boolean;

  /**
   * Loading state - shows spinner
   * @default false
   */
  loading?: boolean;

  /**
   * Whether the select is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Placeholder text when no value selected
   */
  placeholder?: string;

  /**
   * Array of options to display
   */
  options: SelectOption<T>[];

  /**
   * Current value (controlled mode)
   */
  value?: T | T[];

  /**
   * Default value (uncontrolled mode)
   */
  defaultValue?: T | T[];

  /**
   * Callback when value changes
   */
  onChange?: (value: T | T[]) => void;

  /**
   * Callback when blur event occurs (useful for react-hook-form)
   */
  onBlur?: () => void;

  /**
   * Allow clearing the selection
   * @default false
   */
  allowClear?: boolean;

  /**
   * Enable search/filter functionality
   * @default false
   */
  showSearch?: boolean;

  /**
   * Selection mode
   * @default 'single'
   */
  mode?: SelectMode;

  /**
   * Accessible label for screen readers
   */
  ariaLabel?: string;

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Field name for form integration
   */
  name?: string;

  /**
   * Auto focus on mount
   * @default false
   */
  autoFocus?: boolean;

  /**
   * Custom dropdown render
   */
  dropdownRender?: (menu: React.ReactElement) => React.ReactElement;

  /**
   * Filter option function for search
   */
  filterOption?: boolean | ((inputValue: string, option?: SelectOption<T>) => boolean);

  /**
   * Max tag count to show (for multiple/tags mode)
   */
  maxTagCount?: number | 'responsive';

  /**
   * Popup container (for positioning in modals)
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
}
