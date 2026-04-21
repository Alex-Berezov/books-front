import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  SeoBasicSection,
  SeoOpenGraphSection,
  SeoTechnicalSection,
  SeoTwitterSection,
} from '@/components/admin/common/SeoSections';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { Select } from '@/components/common/Select';
import { generateSlug } from '@/lib/utils/slug';
import styles from './TagTranslationsModal.module.scss';
import { translationSchema, type TranslationFormData } from './TagTranslationsModal.types';

interface TranslationFormProps {
  initialData?: TranslationFormData;
  availableLanguages: { value: string; label: ReactNode }[];
  isEditing: boolean;
  isLoading: boolean;
  onSubmit: (data: TranslationFormData) => Promise<void>;
  onCancel: () => void;
}

export const TranslationForm = (props: TranslationFormProps) => {
  const { initialData, availableLanguages, isEditing, isLoading, onSubmit, onCancel } = props;

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
      description: '',
      seoMetaTitle: '',
      seoMetaDescription: '',
      seoCanonicalUrl: '',
      seoRobots: 'index, follow',
      seoOgTitle: '',
      seoOgDescription: '',
      seoOgImageUrl: '',
      seoTwitterCard: 'summary',
    },
  });

  const watchedName = watch('name');

  // Auto-generate slug from name when creating a new translation
  useEffect(() => {
    if (watchedName && !isEditing) {
      setValue('slug', generateSlug(watchedName));
    }
  }, [watchedName, setValue, isEditing]);

  // Mirror Meta Title/Description to the matching OG fields as user types,
  // consistent with the Pages/Categories form behaviour.
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'seoMetaTitle') {
        setValue('seoOgTitle', value.seoMetaTitle || '', {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
      if (name === 'seoMetaDescription') {
        setValue('seoOgDescription', value.seoMetaDescription || '', {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formTitle}>{isEditing ? 'Edit Translation' : 'New Translation'}</div>

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
              disabled={isEditing}
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

      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <span className={styles.hint}>
          Long-form text displayed on the public tag page for this language.
        </span>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Describe this tag…"
              disabled={isLoading}
              error={!!errors.description}
              ariaLabel="Tag description"
            />
          )}
        />
        {errors.description?.message && (
          <span className={styles.errorText}>{errors.description.message}</span>
        )}
      </div>

      <div className={styles.seoBlock}>
        <h3 className={styles.seoBlockTitle}>SEO Settings</h3>

        <SeoBasicSection<TranslationFormData>
          errors={errors}
          isSubmitting={isLoading}
          metaDescriptionField="seoMetaDescription"
          metaTitleField="seoMetaTitle"
          register={register}
          styles={styles}
          watch={watch}
        />

        <SeoTechnicalSection<TranslationFormData>
          canonicalUrlField="seoCanonicalUrl"
          control={control}
          errors={errors}
          isSubmitting={isLoading}
          languageField="language"
          register={register}
          robotsField="seoRobots"
          setValue={setValue}
          slugField="slug"
          styles={styles}
          watch={watch}
        />

        <SeoOpenGraphSection<TranslationFormData>
          control={control}
          errors={errors}
          isSubmitting={isLoading}
          ogDescriptionField="seoOgDescription"
          ogImageUrlField="seoOgImageUrl"
          ogTitleField="seoOgTitle"
          register={register}
          styles={styles}
          watch={watch}
        />

        <SeoTwitterSection<TranslationFormData>
          control={control}
          errors={errors}
          isSubmitting={isLoading}
          register={register}
          styles={styles}
          twitterCardField="seoTwitterCard"
        />
      </div>

      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button variant="primary" type="submit" loading={isLoading}>
          Save
        </Button>
      </div>
    </form>
  );
};
