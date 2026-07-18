'use client';

import { useState, useId } from 'react';
import styles from './TagDetailPage.module.scss';

interface TagDetailInteractionsProps {
  description: string;
  descriptionSectionTitle: string;
  showMoreLabel: string;
  showLessLabel: string;
}

export function TagDetailInteractions({
  description,
  descriptionSectionTitle,
  showMoreLabel,
  showLessLabel,
}: TagDetailInteractionsProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const descId = useId();

  const descriptionIsLong = description.length > 300;

  if (!description) return null;

  return (
    <section className={styles.descriptionSection}>
      <h2 className={styles.sectionTitle}>{descriptionSectionTitle}</h2>
      <div
        id={descId}
        className={`${styles.description} ${
          !showFullDescription && descriptionIsLong ? styles.descriptionCollapsed : ''
        }`}
        dangerouslySetInnerHTML={{ __html: description }}
      />
      {descriptionIsLong && (
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setShowFullDescription((prev) => !prev)}
          aria-expanded={showFullDescription}
          aria-controls={descId}
        >
          {showFullDescription ? showLessLabel : showMoreLabel}
        </button>
      )}
    </section>
  );
}
