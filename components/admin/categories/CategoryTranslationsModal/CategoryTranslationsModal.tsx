import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSnackbar } from 'notistack';
import {
  useCategoryTranslations,
  useCreateCategoryTranslation,
  useDeleteCategoryTranslation,
  useUpdateCategoryTranslation,
} from '@/api/hooks/useCategories';
import { Button } from '@/components/admin/common/Button';
import { Modal } from '@/components/admin/common/Modal';
import { toUserMessage } from '@/lib/errors';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { LANGUAGE_LABELS, SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { ApiError } from '@/types/api';
import type { TranslationFormData } from './CategoryTranslationsModal.types';
import type {
  Category,
  CategoryTranslation,
  CreateCategoryTranslationRequest,
  SeoInput,
  UpdateCategoryTranslationRequest,
} from '@/types/api-schema';
import styles from './CategoryTranslationsModal.module.scss';
import { TranslationForm } from './TranslationForm';
import { TranslationsList } from './TranslationsList';

interface CategoryTranslationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
}

/**
 * Build `SeoInput` from form data. Meta/OG fields go to `Seo` too: the public SEO bundle
 * and social cards read only `Seo` (`LEGACY-430`, `T96`); the flat translation fields are
 * still sent alongside.
 */
const buildSeoInput = (data: TranslationFormData): SeoInput => ({
  metaTitle: data.seoMetaTitle || null,
  metaDescription: data.seoMetaDescription || null,
  ogTitle: data.seoOgTitle || null,
  ogDescription: data.seoOgDescription || null,
  ogImageUrl: data.seoOgImageUrl || null,
  ogImageAlt: data.seoOgImageAlt || null,
  canonicalUrl: data.seoCanonicalUrl || null,
  robots: data.seoRobots || null,
  twitterCard: data.seoTwitterCard || null,
});

/**
 * Map an existing `CategoryTranslation` to form data shape.
 * Meta/OG fields read the `seo` relation first (the public page reads only `Seo`), then fall back
 * to the flat fields; saving then publishes that flat value (`LEGACY-430`, `T96`).
 */
const translationToFormData = (translation: CategoryTranslation): TranslationFormData => ({
  language: translation.language as SupportedLang,
  name: translation.name,
  slug: translation.slug,
  description: translation.description ?? '',
  h1: translation.h1 ?? '',
  shortDescription: translation.shortDescription ?? '',
  faq: (translation.faq as Array<{ question: string; answer: string }>) ?? [],
  seoMetaTitle: translation.seo?.metaTitle ?? translation.metaTitle ?? '',
  seoMetaDescription: translation.seo?.metaDescription ?? translation.metaDescription ?? '',
  seoCanonicalUrl: translation.seo?.canonicalUrl ?? '',
  seoRobots: translation.seo?.robots ?? 'index, follow',
  seoOgTitle: translation.seo?.ogTitle ?? translation.ogTitle ?? '',
  seoOgDescription: translation.seo?.ogDescription ?? translation.ogDescription ?? '',
  seoOgImageUrl: translation.seo?.ogImageUrl ?? translation.ogImageUrl ?? '',
  seoOgImageAlt: translation.seo?.ogImageAlt ?? translation.ogImageAlt ?? '',
  seoTwitterCard:
    (translation.seo?.twitterCard as 'summary' | 'summary_large_image' | '') || 'summary',
});

export const CategoryTranslationsModal = (props: CategoryTranslationsModalProps) => {
  const { isOpen, onClose, category } = props;
  const { enqueueSnackbar } = useSnackbar();
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState<TranslationFormData | undefined>(undefined);

  const { data: translationsPage, isLoading } = useCategoryTranslations(category.id, {
    enabled: isOpen,
  });
  const translations = translationsPage?.items ?? [];

  const createMutation = useCreateCategoryTranslation();
  const updateMutation = useUpdateCategoryTranslation();
  const deleteMutation = useDeleteCategoryTranslation();

  const handleEdit = (translation: CategoryTranslation) => {
    setEditingLang(translation.language);
    setFormData(translationToFormData(translation));
    setIsFormVisible(true);
  };

  const handleDelete = async (language: string) => {
    if (confirm('Are you sure you want to delete this translation?')) {
      await deleteMutation.mutateAsync({ id: category.id, language });
    }
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setEditingLang(null);
    setFormData(undefined);
  };

  const onSubmit = async (data: TranslationFormData) => {
    try {
      const seo = buildSeoInput(data);
      const faq = data.faq.filter((f) => f.question.trim() && f.answer.trim());

      if (editingLang) {
        const payload: UpdateCategoryTranslationRequest = {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          h1: data.h1 || null,
          shortDescription: data.shortDescription || null,
          metaTitle: data.seoMetaTitle || null,
          metaDescription: data.seoMetaDescription || null,
          ogTitle: data.seoOgTitle || null,
          ogDescription: data.seoOgDescription || null,
          ogImageUrl: data.seoOgImageUrl || null,
          ogImageAlt: data.seoOgImageAlt || null,
          faq: faq.length > 0 ? faq : null,
          seo,
        };
        await updateMutation.mutateAsync({
          id: category.id,
          language: editingLang,
          data: payload,
        });
      } else {
        const payload: CreateCategoryTranslationRequest = {
          language: data.language,
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          h1: data.h1 || null,
          shortDescription: data.shortDescription || null,
          metaTitle: data.seoMetaTitle || null,
          metaDescription: data.seoMetaDescription || null,
          ogTitle: data.seoOgTitle || null,
          ogDescription: data.seoOgDescription || null,
          ogImageUrl: data.seoOgImageUrl || null,
          ogImageAlt: data.seoOgImageAlt || null,
          faq: faq.length > 0 ? faq : null,
          seo,
        };
        await createMutation.mutateAsync({
          id: category.id,
          data: payload,
        });
      }
      handleCancelForm();
    } catch (error) {
      // 4xx и сеть показывает модалка (400 предела FAQ, LEGACY-419, иначе уходил молча); 5xx — глобальный тост.
      if (!(error instanceof ApiError && error.statusCode >= 500)) {
        enqueueSnackbar(toUserMessage(error), { variant: 'error' });
      }
    }
  };

  const availableLanguages = SUPPORTED_LANGS.filter(
    (lang) => !translations.some((t) => t.language === lang) || lang === editingLang
  ).map((lang) => ({
    value: lang,
    label: (
      <span>
        {FLAG_COMPONENTS[lang]} {LANGUAGE_LABELS[lang]}
      </span>
    ),
  }));

  const handleAddNew = () => {
    setEditingLang(null);
    setFormData({
      language: availableLanguages[0]?.value as SupportedLang,
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
    });
    setIsFormVisible(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title={`Translations for "${category.name}"`}
      size="xl"
      showFooter={false}
    >
      <div className={styles.modalContent}>
        {!isFormVisible && (
          <>
            <div className={styles.actions}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddNew}
                disabled={availableLanguages.length === 0}
                leftIcon={<Plus size={16} />}
              >
                Add Translation
              </Button>
            </div>

            <TranslationsList
              translations={translations}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}

        {isFormVisible && (
          <TranslationForm
            editingLang={editingLang}
            availableLanguages={availableLanguages}
            initialData={formData}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            routeBase={category.type}
            onSubmit={onSubmit}
            onCancel={handleCancelForm}
          />
        )}
      </div>
    </Modal>
  );
};
