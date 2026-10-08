import type { FC } from 'react';
import type { IconProps } from './icons.types';

interface AntdPathIconProps extends IconProps {
  /** Контур из `@ant-design/icons-svg` (сетка `64 64 896 896`). */
  d: string;
  /** @default 'currentColor' */
  fill?: string;
}

/**
 * Общая обёртка значков, перенесённых из `@ant-design/icons` (`LEGACY-442`): та же
 * сетка, размер `1em` и скрытие от вспомогательных технологий. Подпись, если она
 * понадобится, ставит кнопка или ссылка вокруг значка.
 */
export const AntdPathIcon: FC<AntdPathIconProps> = ({
  className,
  size = '1em',
  d,
  fill = 'currentColor',
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="64 64 896 896"
    fill={fill}
    aria-hidden="true"
    focusable="false"
  >
    <path d={d} />
  </svg>
);
