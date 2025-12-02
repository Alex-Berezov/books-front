'use client';

import { forwardRef } from 'react';
import type { ButtonProps } from './Button.types';
import styles from './Button.module.scss';

/**
 * UniversalButton - Reusable button component with multiple variants
 *
 * Features:
 * - Multiple visual variants (primary, secondary, danger, success, warning, ghost, link)
 * - Three sizes (sm, md, lg)
 * - Shape options (default, round, circle)
 * - Loading state with custom text
 * - Icon support (left/right)
 * - Full width option
 * - Active state for toggles
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * // Primary submit button with loading
 * <Button type="submit" loading={isSubmitting} loadingText="Saving...">
 *   Save Changes
 * </Button>
 *
 * // Secondary button with icon
 * <Button variant="secondary" leftIcon={<Eye size={16} />}>
 *   Preview
 * </Button>
 *
 * // Danger button
 * <Button variant="danger" onClick={handleDelete}>
 *   Delete
 * </Button>
 *
 * // Ghost icon-only button
 * <Button variant="ghost" shape="circle" ariaLabel="Edit">
 *   <Edit size={16} />
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    variant = 'primary',
    size = 'md',
    shape = 'default',
    fullWidth = false,
    loading = false,
    loadingText = 'Processing...',
    active = false,
    leftIcon,
    rightIcon,
    type = 'button',
    form,
    ariaLabel,
    disabled,
    className,
    children,
    onClick,
    ...rest
  } = props;

  // Determine if button is icon-only
  const isIconOnly = !children && (leftIcon || rightIcon);
  const hasOnlyIconChild =
    !leftIcon && !rightIcon && children && typeof children !== 'string' && !Array.isArray(children);

  // Build class names
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    shape !== 'default' && styles[shape],
    fullWidth && styles.fullWidth,
    active && styles.active,
    loading && styles.loading,
    (isIconOnly || hasOnlyIconChild) && styles.iconOnly,
    disabled && styles.disabled,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Render content
  const renderContent = () => {
    if (loading) {
      return <span className={styles.content}>{loadingText}</span>;
    }

    if (isIconOnly) {
      return <span className={styles.icon}>{leftIcon || rightIcon}</span>;
    }

    return (
      <span className={styles.content}>
        {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
      </span>
    );
  };

  return (
    <button
      ref={ref}
      type={type}
      form={form}
      disabled={disabled || loading}
      onClick={onClick}
      className={classNames}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...rest}
    >
      {renderContent()}
    </button>
  );
});

Button.displayName = 'Button';
