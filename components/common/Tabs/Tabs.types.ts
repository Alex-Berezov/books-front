import type { ReactNode } from 'react';

/** Одна вкладка: ключ, подпись и содержимое панели. */
export interface TabItem {
  key: string;
  label: ReactNode;
  children: ReactNode;
}

/**
 * Вкладки сайта по WAI-ARIA (`tablist` / `tab` / `tabpanel`), без antd (`LEGACY-442`).
 *
 * Стрелки ходят по кругу, Home и End — к краям, фокус и выбор переезжают вместе
 * (автоматическая активация). Неактивные панели пустые: содержимое рисуется только
 * у выбранной, как у `Tabs` antd без `forceRender`.
 */
export interface TabsProps {
  items: TabItem[];
  /** Вкладка, выбранная при первом показе. По умолчанию — первая. */
  defaultActiveKey?: string;
  /** Подпись списка вкладок для экранного диктора. */
  ariaLabel?: string;
  /** Класс корня — для модификаторов вида на месте использования. */
  className?: string;
}
