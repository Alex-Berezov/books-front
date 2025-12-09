import type { FC } from 'react';
import type { Tab, TabType } from './BookVersionTabs.types';
import styles from './BookVersionTabs.module.scss';

/**
 * List of tabs with metadata
 */
const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'read', label: 'Read Content' },
  { id: 'listen', label: 'Audio Content' },
  { id: 'summary', label: 'Summary' },
];

interface BookVersionTabsNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BookVersionTabsNav: FC<BookVersionTabsNavProps> = (props) => {
  const { activeTab, onTabChange } = props;

  return (
    <nav className={styles.tabsNav}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};
