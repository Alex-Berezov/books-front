export interface SkeletonBlockProps {
  /** Размер полосы задаёт класс модуля страницы — инлайн-стили запрещены линтом. */
  className?: string;
}

export interface SkeletonProps {
  /** Сколько строк абзаца. @default 3 */
  rows?: number;
  /** Полоса заголовка над абзацем. @default true */
  title?: boolean;
  /** Квадрат 40×40 слева. @default false */
  avatar?: boolean;
  className?: string;
}
