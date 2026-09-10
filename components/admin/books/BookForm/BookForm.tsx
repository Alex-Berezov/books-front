'use client';

import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { BookFormData, BookFormProps } from './BookForm.types';
import type { FieldErrors } from 'react-hook-form';
import { BasicInfoSection } from './BasicInfoSection';
import styles from './BookForm.module.scss';
import { DetailInfoSection } from './DetailInfoSection';
import { collectFormIssues, type FormFieldIssue } from './fieldLabels';
import { MediaSection } from './MediaSection';
import { SeoSection } from './SeoSection';
import { useBookForm } from './useBookForm';

export type { BookFormData, BookFormProps } from './BookForm.types';

/**
 * Form for creating/editing book version
 *
 * Component with react-hook-form and zod validation.
 * Supports creating new version and editing existing one.
 */
export const BookForm: FC<BookFormProps> = (props) => {
  const {
    lang,
    initialData,
    initialTitle,
    initialAuthor,
    existingLanguages = [],
    onSubmit,
    isSubmitting = false,
    id,
  } = props;

  // 🔴 Язык по умолчанию - первый свободный, а не язык админки.
  //
  // Кнопка «+» стоит в переключателе версий, то есть форма открывается ровно там, где версия
  // текущего языка уже есть. `BasicInfoSection` вычёркивает занятые языки из списка, а antd
  // рисует значение, которого в списке нет, сырой строкой: поле выглядело заполненным,
  // а сохранение уходило в 400 «Version for this language already exists for this book».
  // При правке версии умолчание берётся из `initialData`, поэтому там ничего не считается.
  const defaultLanguage =
    initialData || !existingLanguages.includes(lang)
      ? lang
      : (SUPPORTED_LANGS.find((code) => !existingLanguages.includes(code)) ?? lang);

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useBookForm({
    lang: defaultLanguage,
    initialData,
    initialTitle,
    initialAuthor,
  });

  const [issues, setIssues] = useState<FormFieldIssue[]>([]);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Кнопка отправки живёт в шапке страницы, далеко от полей: без прокрутки сводка появляется
  // за пределами экрана и отказ снова выглядит молчанием.
  useEffect(() => {
    if (issues.length === 0) return;

    const field = document.querySelector<HTMLElement>(`[name="${issues[0].name}"]`);
    const target = field ?? summaryRef.current;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [issues]);

  const handleValid = async (data: BookFormData) => {
    setIssues([]);
    await onSubmit(data);
  };

  /**
   * Отказ проверки больше не молчит. Раньше невалидное поле без видимой подписи
   * (элемент массива, SEO-поле ниже по странице) просто отменяло отправку: запрос не уходил,
   * ошибок не появлялось, кнопка выглядела нажатой впустую.
   */
  const handleInvalid = (formErrors: FieldErrors<BookFormData>) => {
    setIssues(collectFormIssues(formErrors));
  };

  return (
    <form className={styles.form} id={id} onSubmit={handleSubmit(handleValid, handleInvalid)}>
      {issues.length > 0 && (
        <div ref={summaryRef} className={styles.issueSummary} role="alert">
          <div className={styles.issueSummaryHeader}>
            <AlertTriangle size={18} />
            <span>The form was not saved: check the fields below</span>
          </div>
          <ul className={styles.issueList}>
            {issues.map((issue) => (
              <li key={issue.name} className={styles.issueItem}>
                <span className={styles.issueField}>{issue.label}</span>
                <span className={styles.issueMessage}>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Basic Information */}
      <BasicInfoSection
        bookId={initialData?.bookId}
        control={control}
        errors={errors}
        existingLanguages={existingLanguages}
        isEditMode={!!initialData}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* Media & Type */}
      <MediaSection control={control} errors={errors} register={register} />

      {/* Additional Details (Manual Input) */}
      <DetailInfoSection
        control={control}
        errors={errors}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* SEO Settings */}
      <SeoSection
        control={control}
        errors={errors}
        isSubmitting={isSubmitting}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* Action Buttons */}
      <div className={styles.actions}>
        <Button type="submit" size="lg" loading={isSubmitting}>
          {initialData ? 'Update Version' : 'Create Version'}
        </Button>
      </div>
    </form>
  );
};
