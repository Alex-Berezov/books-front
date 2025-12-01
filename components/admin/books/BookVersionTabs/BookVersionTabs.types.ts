import type { ReactNode } from 'react';

/**
 * Tab type
 */
export type TabType = 'overview' | 'read' | 'listen' | 'summary';

/**
 * Interface for single tab
 */
export interface Tab {
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
