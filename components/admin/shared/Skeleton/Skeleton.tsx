import type { FC, CSSProperties } from 'react';
import classNames from 'classnames';
import styles from './Skeleton.module.scss';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  variant?: 'rect' | 'circle' | 'text' | 'title' | 'avatar' | 'button';
  width?: string | number;
  height?: string | number;
}

/**
 * Skeleton loading component
 * Used to display a placeholder while content is loading
 */
export const Skeleton: FC<SkeletonProps> = (props) => {
  const { className, style, variant = 'rect', width, height } = props;

  const customStyle: CSSProperties = {
    ...style,
    width,
    height,
  };

  return (
    <div
      className={classNames(styles.skeleton, styles[variant], className)}
      style={customStyle}
      aria-hidden="true"
    />
  );
};
