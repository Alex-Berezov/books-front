'use client';

import { useId, useRef, useState, type FC, type KeyboardEvent } from 'react';
import type { TabsProps } from './Tabs.types';
import styles from './Tabs.module.scss';

/**
 * Вкладки сайта (`LEGACY-442`): вид прежних `Tabs` antd 5 вместе с перекрытиями
 * публичных страниц, клавиатура — по WAI-ARIA.
 */
export const Tabs: FC<TabsProps> = ({ items, defaultActiveKey, ariaLabel, className }) => {
  const [activeKey, setActiveKey] = useState<string | undefined>(defaultActiveKey ?? items[0]?.key);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Клавиатура по WAI-ARIA: стрелки ходят по кругу, Home и End — к краям,
  // фокус и выбор переезжают вместе (автоматическая активация).
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveKey(items[next].key);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={className ? `${styles.tabs} ${className}` : styles.tabs}>
      <div className={styles.tabList} role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const selected = item.key === activeKey;
          return (
            <button
              key={item.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.key}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setActiveKey(item.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.key === activeKey;
        return (
          <div
            key={item.key}
            role="tabpanel"
            id={`${baseId}-panel-${item.key}`}
            aria-labelledby={`${baseId}-tab-${item.key}`}
            hidden={!selected}
          >
            {selected && item.children}
          </div>
        );
      })}
    </div>
  );
};
