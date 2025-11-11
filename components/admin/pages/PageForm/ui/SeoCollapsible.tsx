import type { FC, ReactNode } from 'react';
import styles from '../PageForm.module.scss';

export interface SeoCollapsibleProps {
  /** Section title */
  title: string;
  /** Section content */
  children: ReactNode;
  /** Whether section is open by default */
  defaultOpen?: boolean;
}

/**
 * Collapsible section for SEO settings
 *
 * Uses HTML <details>/<summary> for native functionality
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
