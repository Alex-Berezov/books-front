import type { ChangeEvent, FocusEvent, ReactNode } from 'react';

/**
 * Checkbox size options
 */
export type CheckboxSize = 'sm' | 'md' | 'lg';

/**
 * Checkbox label placement options
 */
export type CheckboxLabelPlacement = 'start' | 'end';

/**
 * Checkbox component props
 *
 * Custom styled checkbox with react-hook-form compatibility
 */
export interface CheckboxProps {
  /**
   * Controlled checked state
   */
  checked?: boolean;

  /**
   * Default checked state (uncontrolled mode)
   */
  defaultChecked?: boolean;

  /**
   * Indeterminate state (for "select all" functionality)
   * @default false
   */
  indeterminate?: boolean;

  /**
   * Size of the checkbox
   * @default 'md'
   */
  size?: CheckboxSize;

  /**
   * Whether the checkbox is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Error state for validation
   * @default false
   */
  error?: boolean;

  /**
   * Label content
   */
  label?: ReactNode;

  /**
   * Label placement relative to checkbox
   * @default 'end'
   */
  labelPlacement?: CheckboxLabelPlacement;

  /**
   * Callback when checked state changes
   */
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;

  /**
   * Callback when blur event occurs (useful for react-hook-form)
   * Uses generic event type for compatibility with react-hook-form's ChangeHandler
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBlur?: (e?: FocusEvent<HTMLInputElement> | any) => void;

  /**
   * Accessible label for screen readers (used when no visible label)
   */
  ariaLabel?: string;

  /**
   * Field name for form integration
   */
  name?: string;

  /**
   * HTML id attribute (defaults to name if not provided)
   */
  id?: string;

  /**
   * Value attribute for form submission
   */
  value?: string;

  /**
   * Additional CSS class name
   */
  className?: string;
}
