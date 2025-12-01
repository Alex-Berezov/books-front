'use client';

import type { FC, ReactNode } from 'react';
import styles from './BookVersionTabs.module.scss';

/**
 * Tab type
 */
export type TabType = 'overview' | 'read' | 'listen' | 'summary';

/**
 * Interface for single tab
 */
interface Tab {
  id: TabType;
  label: string;
}

/**
 * BookVersionTabs component props
 */
export interface BookVersionTabsProps {
  /** Current active tab */
  activeTab: TabType;
  /** Callback on tab change */
  onTabChange: (tab: TabType) => void;
  /** Content for Overview tab */
  overviewContent: ReactNode;
  /** Content for Read tab */
  readContent: ReactNode;
  /** Content for Listen tab */
  listenContent: ReactNode;
  /** Content for Summary tab */
  summaryContent: ReactNode;
}

/**
 * List of tabs with metadata
 */
const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'read', label: 'Read Content' },
  { id: 'listen', label: 'Audio Content' },
  { id: 'summary', label: 'Summary' },
];

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
      <nav className={styles.tabsNav}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Active tab content */}
      <div className={styles.tabContent}>{getCurrentTabContent()}</div>
    </div>
  );
};
