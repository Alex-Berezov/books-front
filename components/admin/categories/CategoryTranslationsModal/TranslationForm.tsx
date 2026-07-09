import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
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
import styles from './CategoryTranslationsModal.module.scss';
import { translationSchema, type TranslationFormData } from './CategoryTranslationsModal.types';

interface TranslationFormProps {
  editingLang: string | null;
  availableLanguages: { value: string; label: ReactNode }[];
  initialData?: TranslationFormData;
  isSubmitting: boolean;
  routeBase: string;
  onSubmit: (data: TranslationFormData) => Promise<void>;
  onCancel: () => void;
}

export const TranslationForm = ({
  editingLang,
  availableLanguages,
  initialData,
  isSubmitting,
  routeBase,
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
      description: '',
      h1: '',
      shortDescription: '',
      faq: [],
      seoMetaTitle: '',
      seoMetaDescription: '',
      seoCanonicalUrl: '',
      seoRobots: 'index, follow',
      seoOgTitle: '',
      seoOgDescription: '',
      seoOgImageUrl: '',
      seoOgImageAlt: '',
      seoTwitterCard: 'summary',
    },
  });

  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq,
  } = useFieldArray({ control, name: 'faq' });

  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  const watchedName = watch('name');

  // Auto-generate slug from name when creating a new translation
  useEffect(() => {
    if (watchedName && !editingLang) {
      setValue('slug', generateSlug(watchedName));
    }
  }, [watchedName, setValue, editingLang]);

  const watchedSlug = watch('slug');
  const watchedLang = watch('language');

  // Auto-populate canonical URL when slug and language are set (new translation)
  useEffect(() => {
    if (watchedSlug && watchedLang && !editingLang) {
      const path = routeBase
        ? `/${watchedLang}/${routeBase}/${watchedSlug}`
        : `/${watchedLang}/${watchedSlug}`;
      setValue('seoCanonicalUrl', `https://bibliaris.com${path}`, { shouldValidate: false });
    }
  }, [watchedSlug, watchedLang, editingLang, routeBase, setValue]);

  // Mirror Meta Title/Description to the matching OG fields as user types,
  // consistent with the Pages form behaviour.
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

      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <span className={styles.hint}>
          Long-form text displayed on the public category page for this language.
        </span>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Describe this category…"
              disabled={isSubmitting}
              error={!!errors.description}
              ariaLabel="Category description"
            />
          )}
        />
        {errors.description?.message && (
          <span className={styles.errorText}>{errors.description.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>H1 Heading</label>
        <span className={styles.hint}>Main heading displayed on the category page.</span>
        <Input error={!!errors.h1} {...register('h1')} />
        {errors.h1?.message && <span className={styles.errorText}>{errors.h1.message}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Short Description</label>
        <span className={styles.hint}>Brief summary shown in cards and lists.</span>
        <Controller
          name="shortDescription"
          control={control}
          render={({ field }) => (
            <textarea
              className={styles.textarea}
              {...field}
              rows={3}
              placeholder="Short description…"
            />
          )}
        />
        {errors.shortDescription?.message && (
          <span className={styles.errorText}>{errors.shortDescription.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>FAQ</label>
        <span className={styles.hint}>Frequently asked questions about this category.</span>
        <div className={styles.translationsList}>
          {faqFields.map((field, index) => (
            <div
              key={field.id}
              className={styles.translationItem}
              style={{ flexDirection: 'column', gap: '4px' }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong>Q: {field.question}</strong>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeFaq(index)}
                  className={styles.deleteButton}
                >
                  Remove
                </Button>
              </div>
              <span style={{ color: 'var(--color-text-secondary)' }}>A: {field.answer}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <Input
            placeholder="FAQ Question"
            value={newFaqQuestion}
            onChange={(e) => setNewFaqQuestion(e.target.value)}
          />
          <textarea
            className={styles.textarea}
            placeholder="FAQ Answer…"
            value={newFaqAnswer}
            onChange={(e) => setNewFaqAnswer(e.target.value)}
            rows={2}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (newFaqQuestion.trim() && newFaqAnswer.trim()) {
                appendFaq({ question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() });
                setNewFaqQuestion('');
                setNewFaqAnswer('');
              }
            }}
            style={{ alignSelf: 'flex-end' }}
          >
            Add FAQ Item
          </Button>
        </div>
        {errors.faq?.message && <span className={styles.errorText}>{errors.faq.message}</span>}
      </div>

      <div className={styles.seoBlock}>
        <h3 className={styles.seoBlockTitle}>SEO Settings</h3>

        <SeoBasicSection<TranslationFormData>
          errors={errors}
          isSubmitting={isSubmitting}
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
          isSubmitting={isSubmitting}
          languageField="language"
          register={register}
          robotsField="seoRobots"
          routeBase={routeBase}
          setValue={setValue}
          slugField="slug"
          styles={styles}
          watch={watch}
        />

        <SeoOpenGraphSection<TranslationFormData>
          control={control}
          errors={errors}
          isSubmitting={isSubmitting}
          ogDescriptionField="seoOgDescription"
          ogImageAltField="seoOgImageAlt"
          ogImageUrlField="seoOgImageUrl"
          ogTitleField="seoOgTitle"
          register={register}
          styles={styles}
          watch={watch}
        />

        <SeoTwitterSection<TranslationFormData>
          control={control}
          errors={errors}
          isSubmitting={isSubmitting}
          register={register}
          styles={styles}
          twitterCardField="seoTwitterCard"
        />
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
