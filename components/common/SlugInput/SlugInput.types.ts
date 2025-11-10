import type { SlugEntityType } from '@/lib/hooks/useSlugValidation';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Пропсы компонента SlugInput
 */
export interface SlugInputProps {
  /** Текущее значение slug */
  value: string;
  /** Callback при изменении slug */
  onChange: (value: string) => void;
  /** Исходное значение для автогенерации (обычно title) */
  sourceValue?: string;
  /** Тип сущности (page | book) для проверки уникальности */
  entityType: SlugEntityType;
  /** Язык (для pages) */
  lang?: SupportedLang;
  /** ID редактируемой сущности (для исключения из проверки уникальности) */
  excludeId?: string;
  /** Отключить поле */
  disabled?: boolean;
  /** Показывать ли кнопку "Generate from title" */
  showGenerateButton?: boolean;
  /** Автоматически генерировать slug при вводе sourceValue */
  autoGenerate?: boolean;
  /** Placeholder для input */
  placeholder?: string;
  /** ID для HTML элемента */
  id?: string;
  /** CSS класс для кастомизации */
  className?: string;
  /** Сообщение об ошибке валидации (из react-hook-form) */
  error?: string;
}

/**
 * Пропсы для компонента StatusIcon
 */
export interface StatusIconProps {
  /** Статус валидации */
  status: 'idle' | 'checking' | 'valid' | 'invalid';
}

/**
 * Пропсы для компонента GenerateButton
 */
export interface GenerateButtonProps {
  /** Есть ли исходное значение для генерации */
  hasSourceValue: boolean;
  /** Обработчик клика */
  onClick: () => void;
}

/**
 * Пропсы для компонента ValidationHint
 */
export interface ValidationHintProps {
  /** Placeholder для примера */
  placeholder: string;
}

/**
 * Пропсы для компонента DuplicateWarning
 */
export interface DuplicateWarningProps {
  /** Тип сущности */
  entityType: SlugEntityType;
  /** Текущий slug */
  slug: string;
  /** Существующая сущность с таким slug */
  existingItem: {
    title: string;
    status: string;
  };
  /** Предложенный slug */
  suggestedSlug?: string;
  /** Обработчик применения предложенного slug */
  onUseSuggested: () => void;
}
