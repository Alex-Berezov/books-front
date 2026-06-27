'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './book.module.scss';

interface DescriptionWrapperProps {
  children: React.ReactNode;
  showMoreText: string;
  showLessText: string;
}

export default function DescriptionWrapper({
  children,
  showMoreText,
  showLessText,
}: DescriptionWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hasMultipleParagraphs, setHasMultipleParagraphs] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Find the inner element that contains the description paragraphs
      const innerDiv = containerRef.current.querySelector(`.${styles.description}`);
      if (innerDiv) {
        const paragraphCount = innerDiv.children.length;
        if (paragraphCount <= 1) {
          setHasMultipleParagraphs(false);
          setIsCollapsed(false); // Make sure it's expanded if there's only 1 paragraph
        }
      } else {
        // Fallback or no description text
        setHasMultipleParagraphs(false);
        setIsCollapsed(false);
      }
    }
  }, []);

  return (
    <div className={styles.descriptionContainer} ref={containerRef}>
      <div className={isCollapsed && hasMultipleParagraphs ? styles.collapsed : ''}>{children}</div>
      {hasMultipleParagraphs && (
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? showMoreText : showLessText}
        </button>
      )}
    </div>
  );
}
