import type { FC } from 'react';
import { RichTextContent } from '@/components/common/RichTextContent';
import styles from './SeoDescription.module.scss';

export interface SeoDescriptionProps {
  description: string;
}

export const SeoDescription: FC<SeoDescriptionProps> = ({ description }) => {
  if (!description) return null;

  return (
    <div className={styles.seoDescription}>
      <RichTextContent html={description} className={styles.content} />
    </div>
  );
};
