/**
 * Переиспользуемый компонент для ввода slug
 *
 * Умеет:
 * - Автоматически генерировать slug из sourceValue (обычно title)
 * - Проверять уникальность slug через API с debounce
 * - Показывать статус валидации (проверяется, уникален, занят)
 * - Предлагать альтернативный slug если текущий занят
 * - Предупреждать о дубликатах с информацией о существующей странице
 */

'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, FC, FocusEvent } from 'react';
import { useSlugValidation } from '@/lib/hooks/useSlugValidation';
import { generateSlug, isValidSlug } from '@/lib/utils/slug';
import type { SlugEntityType } from '@/lib/hooks/useSlugValidation';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './SlugInput.module.scss';

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
 * Компонент для ввода slug с автогенерацией и проверкой уникальности
 *
 * @example
 * // В форме страницы с react-hook-form
 * <SlugInput
 *   value={watch('slug')}
 *   onChange={(slug) => setValue('slug', slug)}
 *   sourceValue={watch('title')}
 *   entityType="page"
 *   lang="en"
 *   autoGenerate
 *   showGenerateButton
 * />
 */
export const SlugInput: FC<SlugInputProps> = (props) => {
  const {
    autoGenerate = true,
    className,
    disabled = false,
    entityType,
    error,
    excludeId,
    id = 'slug',
    lang,
    onChange,
    placeholder = 'about-us',
    showGenerateButton = true,
    sourceValue,
    value,
  } = props;

  // Состояние: был ли slug изменён вручную пользователем
  const [wasManuallyEdited, setWasManuallyEdited] = useState(false);

  // Хук для проверки уникальности slug
  const { existingItem, isUnique, status, suggestedSlug, validate } = useSlugValidation({
    entityType,
    lang,
    excludeId,
    enabled: !disabled,
  });

  /**
   * Автогенерация slug при изменении sourceValue (title)
   */
  useEffect(() => {
    // Не генерируем автоматически если:
    // - autoGenerate выключен
    // - slug был изменён вручную
    // - нет sourceValue
    if (!autoGenerate || wasManuallyEdited || !sourceValue) {
      return;
    }

    const generatedSlug = generateSlug(sourceValue);

    // Обновляем только если сгенерированный slug отличается от текущего
    if (generatedSlug !== value) {
      onChange(generatedSlug);
    }
  }, [sourceValue, autoGenerate, wasManuallyEdited, value, onChange]);

  /**
   * Проверка уникальности при изменении slug
   */
  useEffect(() => {
    if (value && isValidSlug(value)) {
      validate(value);
    }
  }, [value, validate]);

  /**
   * Обработка ручного изменения slug
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Приводим к lowercase и удаляем недопустимые символы на лету
    const sanitizedValue = newValue
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-'); // Убираем множественные дефисы

    onChange(sanitizedValue);

    // Помечаем что slug был изменён вручную
    if (!wasManuallyEdited) {
      setWasManuallyEdited(true);
    }
  };

  /**
   * Обработка потери фокуса (убираем дефисы в начале/конце)
   */
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.replace(/^-+|-+$/g, '');
    if (trimmedValue !== e.target.value) {
      onChange(trimmedValue);
    }
  };

  /**
   * Генерация slug из sourceValue по клику на кнопку
   */
  const handleGenerateClick = () => {
    if (!sourceValue) {
      return;
    }

    const generatedSlug = generateSlug(sourceValue);
    onChange(generatedSlug);
    setWasManuallyEdited(false); // Сбрасываем флаг ручного редактирования
  };

  /**
   * Применить предложенный slug
   */
  const handleUseSuggested = () => {
    if (suggestedSlug) {
      onChange(suggestedSlug);
    }
  };

  /**
   * Определяем CSS класс для статуса
   */
  const getStatusClass = (): string => {
    if (error) return styles.invalid;
    if (!value) return '';
    if (status === 'checking') return styles.checking;
    if (status === 'valid') return styles.valid;
    if (status === 'invalid') return styles.invalid;
    return '';
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Основное поле ввода */}
      <div className={styles.inputWrapper}>
        <input
          className={`${styles.input} ${getStatusClass()}`}
          disabled={disabled}
          id={id}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder={placeholder}
          type="text"
          value={value}
        />

        {/* Иконка статуса */}
        {!disabled && value && (
          <div className={styles.statusIcon}>
            {status === 'checking' && <span className={styles.spinner}>⏳</span>}
            {status === 'valid' && <span className={styles.checkmark}>✓</span>}
            {status === 'invalid' && <span className={styles.cross}>✗</span>}
          </div>
        )}

        {/* Кнопка генерации slug */}
        {showGenerateButton && !disabled && sourceValue && (
          <button
            className={styles.generateButton}
            onClick={handleGenerateClick}
            title="Generate slug from title"
            type="button"
          >
            Generate
          </button>
        )}
      </div>

      {/* Hint: URL-friendly формат */}
      {!error && !existingItem && (
        <span className={styles.hint}>
          URL-friendly identifier (lowercase, hyphens only). Example: {placeholder}
        </span>
      )}

      {/* Ошибка валидации из react-hook-form */}
      {error && <span className={styles.error}>{error}</span>}

      {/* Предупреждение о неуникальности slug */}
      {!error && isUnique === false && existingItem && (
        <div className={styles.warningBox}>
          <div className={styles.warningHeader}>
            <span className={styles.warningIcon}>⚠️</span>
            <strong>Slug is already taken</strong>
          </div>
          <div className={styles.warningContent}>
            <p>
              A {entityType === 'page' ? 'page' : 'book'} with slug <code>{value}</code> already
              exists:
            </p>
            <div className={styles.existingItem}>
              <div>
                <strong>{existingItem.title}</strong>
              </div>
              <div className={styles.existingItemMeta}>
                Status: <span className={styles.badge}>{existingItem.status}</span>
              </div>
            </div>

            {suggestedSlug && (
              <div className={styles.suggestion}>
                <p>Try using:</p>
                <button
                  className={styles.suggestionButton}
                  onClick={handleUseSuggested}
                  type="button"
                >
                  <code>{suggestedSlug}</code>
                  <span className={styles.suggestionIcon}>→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
