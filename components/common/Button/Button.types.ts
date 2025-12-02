import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Button variant types for visual styling
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'ghost'
  | 'link';

/**
 * Button size options
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button shape options (for icon-only buttons)
 */
export type ButtonShape = 'default' | 'round' | 'circle';

/**
 * UniversalButton component props
 *
 * Extends native button attributes with custom styling and behavior options
 */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /**
   * Visual variant of the button
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Size of the button
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * Shape of the button (useful for icon-only buttons)
   * @default 'default'
   */
  shape?: ButtonShape;

  /**
   * Whether the button should take full width of its container
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Loading state - shows loading indicator and disables button
   * @default false
   */
  loading?: boolean;

  /**
   * Text to display when loading
   * @default 'Processing...'
   */
  loadingText?: string;

  /**
   * Active state for toggle/filter buttons
   * @default false
   */
  active?: boolean;

  /**
   * Icon to display on the left side of the text
   */
  leftIcon?: ReactNode;

  /**
   * Icon to display on the right side of the text
   */
  rightIcon?: ReactNode;

  /**
   * HTML button type
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';

  /**
   * Form ID to associate with (for submit buttons outside forms)
   */
  form?: string;

  /**
   * Accessible label for screen readers
   */
  ariaLabel?: string;

  /**
   * Button content
   */
  children?: ReactNode;
}
