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
import type { SlugInputProps } from './SlugInput.types';
import styles from './SlugInput.module.scss';
import { DuplicateWarning } from './ui/DuplicateWarning';
import { GenerateButton } from './ui/GenerateButton';
import { StatusIcon } from './ui/StatusIcon';
import { ValidationHint } from './ui/ValidationHint';

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

  // Определяем показывать ли дублирование
  const showDuplicateWarning = !error && isUnique === false && existingItem;

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
        {!disabled && value && <StatusIcon status={status} />}

        {/* Кнопка генерации slug */}
        {showGenerateButton && !disabled && (
          <GenerateButton hasSourceValue={!!sourceValue} onClick={handleGenerateClick} />
        )}
      </div>

      {/* Hint: URL-friendly формат */}
      {!error && !existingItem && <ValidationHint placeholder={placeholder} />}

      {/* Ошибка валидации из react-hook-form */}
      {error && <span className={styles.error}>{error}</span>}

      {/* Предупреждение о неуникальности slug */}
      {showDuplicateWarning && (
        <DuplicateWarning
          entityType={entityType}
          slug={value}
          existingItem={existingItem}
          suggestedSlug={suggestedSlug}
          onUseSuggested={handleUseSuggested}
        />
      )}
    </div>
  );
};
