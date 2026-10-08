import type { FC } from 'react';
import type { SkeletonBlockProps, SkeletonProps } from './Skeleton.types';
import styles from './Skeleton.module.scss';

/**
 * Одна полоса-заглушка: по умолчанию размером с кнопку (64×32).
 * Ширину и высоту задаёт `className` из модуля страницы — инлайн-стили запрещены линтом.
 */
export const SkeletonBlock: FC<SkeletonBlockProps> = ({ className }) => (
  <span
    className={[styles.shimmer, styles.block, className].filter(Boolean).join(' ')}
    data-skeleton=""
    aria-hidden="true"
  />
);

/**
 * Заглушка блока текста на время загрузки — заголовок и строки абзаца,
 * последняя строка короче. Повторяет вид `Skeleton` из antd, который стоял
 * на публичных страницах до `LEGACY-442`.
 *
 * `data-skeleton` — метка для тестов: классы модуля хешируются.
 */
export const Skeleton: FC<SkeletonProps> = ({
  rows = 3,
  title = true,
  avatar = false,
  className,
}) => (
  <div
    className={[styles.skeleton, className].filter(Boolean).join(' ')}
    data-skeleton=""
    aria-hidden="true"
  >
    {avatar && <span className={`${styles.shimmer} ${styles.avatar}`} />}
    <div className={styles.content}>
      {title && <span className={`${styles.shimmer} ${styles.title}`} />}
      {rows > 0 && (
        <ul className={styles.paragraph}>
          {Array.from({ length: rows }, (_, at) => (
            <li key={at} className={styles.shimmer} />
          ))}
        </ul>
      )}
    </div>
  </div>
);
