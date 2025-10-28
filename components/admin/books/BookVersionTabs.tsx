'use client';

import type { FC, ReactNode } from 'react';
import styles from './BookVersionTabs.module.scss';

/**
 * Тип таба
 */
export type TabType = 'overview' | 'read' | 'listen' | 'summary';

/**
 * Интерфейс для одного таба
 */
interface Tab {
  id: TabType;
  label: string;
}

/**
 * Пропсы компонента BookVersionTabs
 */
export interface BookVersionTabsProps {
  /** Текущий активный таб */
  activeTab: TabType;
  /** Callback при смене таба */
  onTabChange: (tab: TabType) => void;
  /** Контент для Overview таба */
  overviewContent: ReactNode;
  /** Контент для Read таба */
  readContent: ReactNode;
  /** Контент для Listen таба */
  listenContent: ReactNode;
  /** Контент для Summary таба */
  summaryContent: ReactNode;
}

/**
 * Список табов с метаданными
 */
const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'read', label: 'Read Content' },
  { id: 'listen', label: 'Audio Content' },
  { id: 'summary', label: 'Summary' },
];

/**
 * Компонент табов для редактора версии книги
 *
 * Позволяет переключаться между разными разделами редактирования:
 * - Overview: Основная информация о книге
 * - Read Content: Текстовый контент (главы)
 * - Audio Content: Аудио контент
 * - Summary: Краткое содержание и выводы
 */
export const BookVersionTabs: FC<BookVersionTabsProps> = (props) => {
  const { activeTab, listenContent, onTabChange, overviewContent, readContent, summaryContent } =
    props;

  /**
   * Получить контент для текущего активного таба
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
      {/* Навигация табов */}
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

      {/* Контент активного таба */}
      <div className={styles.tabContent}>{getCurrentTabContent()}</div>
    </div>
  );
};
