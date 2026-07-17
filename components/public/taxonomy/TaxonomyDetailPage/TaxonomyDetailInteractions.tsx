'use client';

import { useState, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './TaxonomyDetailPage.module.scss';

interface TaxonomyDetailInteractionsProps {
  browseLabel: string;
  sidebarContent: ReactNode;
  description: string;
  descriptionSectionTitle: string;
  showMoreLabel: string;
  showLessLabel: string;
}

export function TaxonomyDetailInteractions({
  browseLabel,
  sidebarContent,
  description,
  descriptionSectionTitle,
  showMoreLabel,
  showLessLabel,
}: TaxonomyDetailInteractionsProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const descId = useId();

  const descriptionIsLong = description.length > 300;

  return (
    <>
      <div className={styles.mobileBrowseBtnWrapper}>
        <button
          type="button"
          className={styles.mobileBrowseBtn}
          onClick={() => setMobileSidebarOpen(true)}
        >
          {browseLabel}
        </button>
      </div>

      {mobileSidebarOpen && (
        <div
          className={styles.mobileOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={browseLabel}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className={styles.mobileOverlayBackdrop}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className={styles.mobileOverlayPanel}>
            <div className={styles.mobileOverlayClose}>
              <button type="button" onClick={() => setMobileSidebarOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {description && (
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
      )}
    </>
  );
}
