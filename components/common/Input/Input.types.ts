import type { ChangeEvent, FocusEvent } from 'react';

/**
 * Input size options
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Input type options
 */
export type InputType = 'text' | 'password' | 'email' | 'url' | 'number';

/**
 * Input component props
 *
 * Custom styled input with react-hook-form compatibility
 */
export interface InputProps {
  /**
   * Size of the input
   * @default 'md'
   */
  size?: InputSize;

  /**
   * Whether the input should take full width of container
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Error state for validation
   * @default false
   */
  error?: boolean;

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Loading state - shows spinner
   * @default false
   */
  loading?: boolean;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Current value (controlled mode)
   */
  value?: string;

  /**
   * Default value (uncontrolled mode)
   */
  defaultValue?: string;

  /**
   * Callback when value changes
   */
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;

  /**
   * Callback when blur event occurs (useful for react-hook-form)
   * Uses generic event type for compatibility with react-hook-form's ChangeHandler
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBlur?: (e?: FocusEvent<HTMLInputElement> | any) => void;

  /**
   * Input type
   * @default 'text'
   */
  type?: InputType;

  /**
   * Allow clearing the input value
   * @default false
   */
  allowClear?: boolean;

  /**
   * Maximum length of input value
   */
  maxLength?: number;

  /**
   * Whether to show character count
   * @default false
   */
  showCount?: boolean;

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
   * HTML id attribute (defaults to name if not provided)
   */
  id?: string;

  /**
   * Auto focus on mount
   * @default false
   */
  autoFocus?: boolean;

  /**
   * HTML autocomplete attribute
   */
  autoComplete?: string;
}
