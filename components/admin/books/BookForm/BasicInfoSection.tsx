import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { useAuthors } from '@/api/hooks/useAuthors';
import { useCategories } from '@/api/hooks/useCategories';
import { Input } from '@/components/common/Input';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { Select } from '@/components/common/Select';
import { SlugInput } from '@/components/common/SlugInput';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { BookFormData } from './BookForm.types';
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import styles from './BookForm.module.scss';

interface BasicInfoSectionProps {
  register: UseFormRegister<BookFormData>;
  control: Control<BookFormData>;
  errors: FieldErrors<BookFormData>;
  watch: UseFormWatch<BookFormData>;
  setValue: UseFormSetValue<BookFormData>;
  isEditMode: boolean;
  bookId?: string;
  existingLanguages?: SupportedLang[];
}

export const BasicInfoSection: FC<BasicInfoSectionProps> = (props) => {
  const {
    register,
    control,
    errors,
    watch,
    setValue,
    isEditMode,
    bookId,
    existingLanguages = [],
  } = props;

  // Language options
  const languageOptions = SUPPORTED_LANGS.filter(
    (langCode) => isEditMode || !existingLanguages.includes(langCode)
  ).map((langCode) => ({
    label: langCode.toUpperCase(),
    value: langCode,
  }));

  const { data: categoriesData } = useCategories({ limit: 100 });
  const { data: authorsData } = useAuthors({ limit: 1000 });
  const authorsList = authorsData?.data || [];
  const currentLang = watch('language');
  const categoryOptions = [
    { label: 'None', value: '' },
    ...(categoriesData?.data || []).map((cat) => {
      const trans =
        cat.translations?.find((t) => t.language === watch('language')) || cat.translations?.[0];
      return {
        label: trans?.name || cat.name || cat.id,
        value: cat.id,
      };
    }),
  ];

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Basic Information</h2>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="language">
          Language *
        </label>
        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={languageOptions}
              disabled={isEditMode}
              fullWidth
              error={!!errors.language}
              ariaLabel="Select language"
            />
          )}
        />
        {errors.language && <span className={styles.error}>{errors.language.message}</span>}
        {isEditMode && (
          <span className={styles.hint}>Language cannot be changed after creation</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="title">
          Title *
        </label>
        <Input
          id="title"
          placeholder="Enter book title"
          type="text"
          fullWidth
          {...register('title')}
        />
        {errors.title && <span className={styles.error}>{errors.title.message}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="originalTitle">
          Original Title (optional)
        </label>
        <Input
          id="originalTitle"
          placeholder="Enter original book title"
          type="text"
          fullWidth
          {...register('originalTitle')}
        />
        {errors.originalTitle && (
          <span className={styles.error}>{errors.originalTitle.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="author">
          Author *
        </label>
        <select
          id="author-select"
          className={styles.select}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid var(--color-border-light, #d9d9d9)',
            borderRadius: '6px',
            backgroundColor: 'var(--color-bg-container, #ffffff)',
            color: 'var(--color-text, #000000)',
            marginBottom: '0.5rem',
          }}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'custom') {
              setValue('authorId', '');
            } else if (val === '') {
              setValue('authorId', '');
              setValue('author', '');
              setValue('authorPageUrl', '');
            } else {
              const selected = authorsList.find((a) => a.id === val);
              if (selected) {
                const trans =
                  selected.translations?.find((t) => t.language === currentLang) ||
                  selected.translations?.[0];
                setValue('author', trans?.name || '');
                setValue('authorId', selected.id);
                setValue('authorPageUrl', `/${currentLang}/author/${trans?.slug || ''}`);
              }
            }
          }}
          value={watch('authorId') || ''}
        >
          <option value="">-- Select Existing Author --</option>
          {authorsList.map((a) => {
            const trans =
              a.translations?.find((t) => t.language === currentLang) || a.translations?.[0];
            return (
              <option key={a.id} value={a.id}>
                {trans?.name || a.slug}
              </option>
            );
          })}
          <option value="custom">Custom / New Author (Enter manually below)</option>
        </select>

        {(!watch('authorId') || watch('authorId') === '') && (
          <Input
            id="author"
            placeholder="Enter author name manually"
            type="text"
            fullWidth
            {...register('author')}
          />
        )}
        {errors.author && <span className={styles.error}>{errors.author.message}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="bookSlug">
          Book Slug *
        </label>
        <SlugInput
          autoGenerate
          entityType="book"
          error={errors.bookSlug?.message}
          excludeId={bookId}
          id="bookSlug"
          onChange={(value) => setValue('bookSlug', value)}
          placeholder="harry-potter"
          showGenerateButton
          sourceValue={watch('title')}
          value={watch('bookSlug')}
        />
        <span className={styles.hint}>
          URL-friendly identifier for the book (lowercase, hyphens only). Example: about-us
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="primaryCategoryId">
          Primary Category
        </label>
        <Controller
          name="primaryCategoryId"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              value={field.value ?? ''}
              options={categoryOptions}
              fullWidth
              error={!!errors.primaryCategoryId}
              ariaLabel="Select primary category"
            />
          )}
        />
        {errors.primaryCategoryId && (
          <span className={styles.error}>{errors.primaryCategoryId.message}</span>
        )}
        <span className={styles.hint}>
          The primary category is used to construct clean breadcrumbs for the book page.
        </span>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="firstPublishedYear">
            First Published Year
          </label>
          <Input
            id="firstPublishedYear"
            placeholder="e.g. 1890"
            type="number"
            fullWidth
            {...register('firstPublishedYear')}
          />
          {errors.firstPublishedYear && (
            <span className={styles.error}>{errors.firstPublishedYear.message}</span>
          )}
          <span className={styles.hint}>Historical year of first publication</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="editionPublishedYear">
            Edition Published Year
          </label>
          <Input
            id="editionPublishedYear"
            placeholder="e.g. 1891"
            type="number"
            fullWidth
            {...register('editionPublishedYear')}
          />
          {errors.editionPublishedYear && (
            <span className={styles.error}>{errors.editionPublishedYear.message}</span>
          )}
          <span className={styles.hint}>Year of this specific translation/edition</span>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="description">
          Description
        </label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              id="description"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Enter book description"
              error={!!errors.description}
              minHeight="160px"
            />
          )}
        />
        {errors.description && <span className={styles.error}>{errors.description.message}</span>}
      </div>
    </div>
  );
};
