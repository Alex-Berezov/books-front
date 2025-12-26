import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { generateSlug } from '@/lib/utils/slug';
import styles from './CategoryTranslationsModal.module.scss';
import { translationSchema, type TranslationFormData } from './CategoryTranslationsModal.types';

interface TranslationFormProps {
  editingLang: string | null;
  availableLanguages: { value: string; label: string }[];
  initialData?: TranslationFormData;
  isSubmitting: boolean;
  onSubmit: (data: TranslationFormData) => Promise<void>;
  onCancel: () => void;
}

export const TranslationForm = ({
  editingLang,
  availableLanguages,
  initialData,
  isSubmitting,
  onSubmit,
  onCancel,
}: TranslationFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<TranslationFormData>({
    resolver: zodResolver(translationSchema),
    defaultValues: initialData || {
      language: 'en',
      name: '',
      slug: '',
    },
  });

  const watchedName = watch('name');

  // Auto-generate slug from name
  useEffect(() => {
    if (watchedName && !editingLang) {
      setValue('slug', generateSlug(watchedName));
    }
  }, [watchedName, setValue, editingLang]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formTitle}>{editingLang ? 'Edit Translation' : 'New Translation'}</div>

      <div className={styles.field}>
        <label className={styles.label}>Language</label>
        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={availableLanguages}
              error={!!errors.language}
              disabled={!!editingLang}
            />
          )}
        />
        {errors.language?.message && (
          <span className={styles.errorText}>{errors.language.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <Input error={!!errors.name} {...register('name')} />
        {errors.name?.message && <span className={styles.errorText}>{errors.name.message}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Slug</label>
        <Input error={!!errors.slug} {...register('slug')} />
        {errors.slug?.message && <span className={styles.errorText}>{errors.slug.message}</span>}
      </div>

      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
};
