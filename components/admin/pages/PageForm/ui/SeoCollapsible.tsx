import type { FC, ReactNode } from 'react';
import styles from '../PageForm.module.scss';

export interface SeoCollapsibleProps {
  /** Заголовок секции */
  title: string;
  /** Контент секции */
  children: ReactNode;
  /** Открыта ли секция по умолчанию */
  defaultOpen?: boolean;
}

/**
 * Сворачиваемая секция для SEO настроек
 *
 * Использует HTML <details>/<summary> для нативной функциональности
 */
export const SeoCollapsible: FC<SeoCollapsibleProps> = (props) => {
  const { title, children, defaultOpen = false } = props;

  return (
    <details className={styles.seoSection} open={defaultOpen}>
      <summary className={styles.seoSectionTitle}>{title}</summary>
      <div className={styles.seoSectionContent}>{children}</div>
    </details>
  );
};
