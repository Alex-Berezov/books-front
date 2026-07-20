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
      const innerDiv = containerRef.current.querySelector(`.${styles.description}`) as HTMLElement;
      if (innerDiv) {
        // If scrollHeight is greater than clientHeight, it means it is truncated in collapsed state
        if (innerDiv.scrollHeight > innerDiv.clientHeight) {
          setHasMultipleParagraphs(true);
        } else {
          setHasMultipleParagraphs(false);
          setIsCollapsed(false);
        }
      } else {
        setHasMultipleParagraphs(false);
        setIsCollapsed(false);
      }
    }
  }, []);

  return (
    <div className={styles.descriptionContainer} ref={containerRef}>
      <div
        id="book-description-content"
        className={isCollapsed && hasMultipleParagraphs ? styles.collapsed : ''}
      >
        {children}
      </div>
      {hasMultipleParagraphs && (
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls="book-description-content"
        >
          {isCollapsed ? showMoreText : showLessText}
        </button>
      )}
    </div>
  );
}
