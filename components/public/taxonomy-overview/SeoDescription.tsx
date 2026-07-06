import type { FC } from 'react';
import styles from './SeoDescription.module.scss';

export interface SeoDescriptionProps {
  description: string;
}

export const SeoDescription: FC<SeoDescriptionProps> = ({ description }) => {
  if (!description) return null;

  return (
    <div className={styles.seoDescription}>
      <div className={styles.content} dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
};
