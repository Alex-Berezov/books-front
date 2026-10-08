'use client';

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type Ref } from 'react';
import type { ButtonProps } from './Button.types';
import styles from './Button.module.scss';

/**
 * Кнопка сайта на SCSS-модуле, без antd (`LEGACY-442`).
 *
 * Повторяет вид прежней обёртки над antd: те же размеры, скругления и варианты,
 * поэтому публичные страницы перешли на неё без правки разметки. С `href` рисуется
 * ссылкой — так её отдаёт `next/link` в режиме `legacyBehavior`.
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = 'primary',
      size = 'md',
      shape = 'default',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      type = 'button',
      ariaLabel,
      disabled,
      className,
      children,
      onClick,
      href,
      target,
      rel,
      ...rest
    } = props;

    const hasChildren = children !== undefined && children !== null && children !== false;
    const iconOnly = !hasChildren && Boolean(leftIcon || rightIcon);

    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      shape === 'circle' && styles.circle,
      iconOnly && styles.iconOnly,
      fullWidth && styles.fullWidth,
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const content = (
      <>
        {loading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          leftIcon && <span className={styles.icon}>{leftIcon}</span>
        )}
        {hasChildren && <span>{children}</span>}
        {rightIcon && <span className={`${styles.icon} ${styles.rightIcon}`}>{rightIcon}</span>}
      </>
    );

    // Как у antd: нажатие во время загрузки гасится целиком. Снять `onClick` мало —
    // у `type="submit"` осталась бы обычная отправка формы, кликом или по Enter.
    const swallow = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) =>
      event.preventDefault();

    if (href !== undefined) {
      const inactive = disabled || loading;
      return (
        <a
          {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
          ref={ref as Ref<HTMLAnchorElement>}
          className={classNames}
          href={href}
          target={target}
          rel={rel}
          aria-label={ariaLabel}
          aria-disabled={inactive || undefined}
          aria-busy={loading || undefined}
          onClick={inactive ? swallow : onClick}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        {...rest}
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        className={classNames}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        onClick={loading ? swallow : onClick}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
