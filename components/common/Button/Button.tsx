'use client';

import { forwardRef } from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps } from './Button.types';
import type { ButtonType } from 'antd/es/button';
import styles from './Button.module.scss';

/**
 * Button - Wrapper over antd Button with extended API
 *
 * Features:
 * - Variants: primary, secondary, danger, success, warning, ghost, link
 * - Sizes: sm, md, lg
 * - Shapes: default, round, circle
 * - Loading state
 * - Icons (left/right)
 * - Full width
 * - Active state for toggles
 *
 * @example
 * ```tsx
 * // Primary button with loading
 * <Button type="submit" loading={isSubmitting}>
 *   Save
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
  } = props;

  // Map our variants to antd types
  const getAntdType = (): ButtonType => {
    switch (variant) {
      case 'primary':
        return 'primary';
      case 'ghost':
        return 'text';
      case 'link':
        return 'link';
      case 'secondary':
      case 'danger':
      case 'success':
      case 'warning':
      default:
        return 'default';
    }
  };

  // Map sizes
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

  // Map shape
  const getAntdShape = () => {
    if (shape === 'circle') return 'circle' as const;
    if (shape === 'round') return 'round' as const;
    return undefined;
  };

  // Build class names for custom styles
  const classNames = [
    styles.button,
    styles[variant],
    fullWidth && styles.fullWidth,
    active && styles.active,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <AntButton
      ref={ref}
      type={getAntdType()}
      size={getAntdSize()}
      shape={getAntdShape()}
      loading={loading}
      disabled={disabled}
      danger={variant === 'danger'}
      block={fullWidth}
      icon={leftIcon}
      htmlType={type}
      form={form}
      onClick={onClick}
      className={classNames}
      aria-label={ariaLabel}
    >
      {!leftIcon && children}
      {leftIcon && children}
      {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
    </AntButton>
  );
});

Button.displayName = 'Button';
