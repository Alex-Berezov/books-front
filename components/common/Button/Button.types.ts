import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react';

/** Вид кнопки сайта. Набор — ровно тот, что стоит на публичных страницах. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonShape = 'default' | 'circle';

/**
 * Кнопка публичной части сайта, без antd (`LEGACY-442`).
 *
 * Админка пользуется своей кнопкой на antd — `components/admin/common/Button`:
 * там она связана с `Form`, `Popconfirm` и темой `ConfigProvider`.
 */
export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'onClick'
> {
  /** @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'md' */
  size?: ButtonSize;
  /** @default 'default' */
  shape?: ButtonShape;
  fullWidth?: boolean;
  /** Показывает индикатор и не пропускает нажатия. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** @default 'button' */
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  /**
   * Задан — рисуется ссылкой `<a>`. Его же подставляет `next/link`
   * с `passHref legacyBehavior`.
   */
  href?: string;
  target?: string;
  rel?: string;
}
