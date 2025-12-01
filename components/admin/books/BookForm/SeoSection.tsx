import type { FC } from 'react';
import {
  SeoBasicSection,
  SeoOpenGraphSection,
  SeoTechnicalSection,
  SeoTwitterSection,
} from '@/components/admin/common/SeoSections';
import type { BookFormData } from './BookForm.types';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import styles from './BookForm.module.scss';

interface SeoSectionProps {
  register: UseFormRegister<BookFormData>;
  errors: FieldErrors<BookFormData>;
  watch: UseFormWatch<BookFormData>;
  setValue: UseFormSetValue<BookFormData>;
  isSubmitting: boolean;
}

export const SeoSection: FC<SeoSectionProps> = (props) => {
  const { register, errors, watch, setValue, isSubmitting } = props;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>SEO Settings</h2>

      <SeoBasicSection<BookFormData>
        errors={errors}
        isSubmitting={isSubmitting}
        metaDescriptionField="seoMetaDescription"
        metaTitleField="seoMetaTitle"
        register={register}
        styles={styles}
        watch={watch}
      />

      <SeoTechnicalSection<BookFormData>
        canonicalUrlField="seoCanonicalUrl"
        errors={errors}
        isSubmitting={isSubmitting}
        languageField="language"
        register={register}
        robotsField="seoRobots"
        setValue={setValue}
        slugField="bookSlug"
        styles={styles}
        watch={watch}
      />

      <SeoOpenGraphSection<BookFormData>
        errors={errors}
        isSubmitting={isSubmitting}
        ogDescriptionField="seoOgDescription"
        ogImageUrlField="seoOgImageUrl"
        ogTitleField="seoOgTitle"
        register={register}
        styles={styles}
        watch={watch}
      />

      <SeoTwitterSection<BookFormData>
        errors={errors}
        isSubmitting={isSubmitting}
        register={register}
        styles={styles}
        twitterCardField="seoTwitterCard"
      />
    </div>
  );
};
