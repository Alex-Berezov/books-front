import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  /** Язык страницы: на него ведёт кнопка «назад». */
  lang: string;
  /** Содержимое колонки формы под шапкой. */
  children: ReactNode;
}
