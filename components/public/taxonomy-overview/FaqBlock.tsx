import type { FC } from 'react';
import styles from './FaqBlock.module.scss';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqBlockProps {
  items: FaqItem[];
}

export const FaqBlock: FC<FaqBlockProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className={styles.faqBlock}>
        <h2 className={styles.title}>FAQ</h2>
        <div className={styles.items}>
          {items.map((item, index) => (
            <details key={index} className={styles.item}>
              <summary className={styles.question}>{item.question}</summary>
              <p className={styles.answer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
};
