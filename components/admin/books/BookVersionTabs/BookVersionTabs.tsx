'use client';

import type { FC, ReactNode } from 'react';
import type { BookVersionTabsProps } from './BookVersionTabs.types';
import styles from './BookVersionTabs.module.scss';
import { BookVersionTabsNav } from './BookVersionTabsNav';

export type { BookVersionTabsProps, TabType } from './BookVersionTabs.types';

/**
 * Tabs component for book version editor
 *
 * Allows switching between different editing sections:
 * - Overview: Main book information
 * - Read Content: Text content (chapters)
 * - Audio Content: Audio content
 * - Summary: Brief summary and conclusions
 */
export const BookVersionTabs: FC<BookVersionTabsProps> = (props) => {
  const { activeTab, listenContent, onTabChange, overviewContent, readContent, summaryContent } =
    props;

  /**
   * Get content for current active tab
   */
  const getCurrentTabContent = (): ReactNode => {
    switch (activeTab) {
      case 'overview':
        return overviewContent;
      case 'read':
        return readContent;
      case 'listen':
        return listenContent;
      case 'summary':
        return summaryContent;
      default:
        return overviewContent;
    }
  };

  return (
    <div className={styles.tabsContainer}>
      {/* Tab navigation */}
      <BookVersionTabsNav activeTab={activeTab} onTabChange={onTabChange} />

      {/* Active tab content */}
      <div className={styles.tabContent}>{getCurrentTabContent()}</div>
    </div>
  );
};
