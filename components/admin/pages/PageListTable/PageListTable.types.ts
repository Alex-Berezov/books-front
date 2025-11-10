import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicationStatus } from '@/types/api-schema';

/**
 * Пропсы для компонента PageListTable
 */
export interface PageListTableProps {
  /** Текущий язык интерфейса */
  lang: SupportedLang;
}

/**
 * Пропсы для компонента SearchForm
 */
export interface SearchFormProps {
  /** Текущее значение поискового запроса */
  searchValue: string;
  /** Активный поисковый запрос */
  search: string;
  /** Обработчик изменения значения поиска */
  onSearchValueChange: (value: string) => void;
  /** Обработчик отправки формы поиска */
  onSearch: (e: React.FormEvent) => void;
  /** Обработчик очистки поиска */
  onClearSearch: () => void;
}

/**
 * Пропсы для компонента StatusFilter
 */
export interface StatusFilterProps {
  /** Текущий статус фильтра */
  statusFilter: PublicationStatus | 'all';
  /** Обработчик изменения фильтра статуса */
  onStatusFilterChange: (status: PublicationStatus | 'all') => void;
}

/**
 * Пропсы для компонента PaginationControls
 */
export interface PaginationControlsProps {
  /** Текущая страница */
  currentPage: number;
  /** Всего страниц */
  totalPages: number;
  /** Всего элементов */
  totalItems?: number;
  /** Обработчик перехода на предыдущую страницу */
  onPrevious: () => void;
  /** Обработчик перехода на следующую страницу */
  onNext: () => void;
  /** Показывать ли информацию о количестве элементов */
  showItemsCount?: boolean;
}

/**
 * Пропсы для компонента PageTable
 */
export interface PageTableProps {
  /** Массив страниц для отображения */
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    language: string;
    status: PublicationStatus;
    updatedAt: string;
  }>;
  /** Текущий язык для формирования ссылок */
  lang: SupportedLang;
  /** Флаг загрузки удаления */
  isDeletingPage: boolean;
  /** Обработчик удаления страницы */
  onDelete: (pageId: string, pageTitle: string) => void;
}

/**
 * Пропсы для компонента LoadingState
 */
export interface LoadingStateProps {
  /** Текущий язык для формирования ссылок */
  lang: SupportedLang;
}

/**
 * Пропсы для компонента ErrorState
 */
export interface ErrorStateProps {
  /** Текущий язык для формирования ссылок */
  lang: SupportedLang;
  /** Сообщение об ошибке */
  errorMessage: string;
}

/**
 * Пропсы для компонента EmptyState
 */
export interface EmptyStateProps {
  /** Текущий язык для формирования ссылок */
  lang: SupportedLang;
  /** Активный поисковый запрос */
  search?: string;
}
