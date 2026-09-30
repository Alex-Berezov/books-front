import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSnackbar } from 'notistack';
import {
  useCreateTagTranslation,
  useDeleteTagTranslation,
  useTagTranslations,
  useUpdateTagTranslation,
} from '@/api/hooks/useTags';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { toUserMessage } from '@/lib/errors';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { LANGUAGE_LABELS, SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { ApiError } from '@/types/api';
import type {
  CreateTagTranslationRequest,
  SeoInput,
  Tag,
  TagTranslation,
  UpdateTagTranslationRequest,
} from '@/types/api-schema';
import styles from './TagTranslationsModal.module.scss';
import {
  arrayToTextarea,
  textareaToArray,
  type TranslationFormData,
} from './TagTranslationsModal.types';
import { TranslationForm } from './TranslationForm';
import { TranslationsList } from './TranslationsList';

interface TagTranslationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: Tag;
}

/**
 * Build `SeoInput` from form data — only fields that live in the `Seo` table
 * (canonical url, robots, twitter card). Meta/OG fields are sent as flat
 * translation fields instead.
 */
const buildSeoInput = (data: TranslationFormData): SeoInput => ({
  canonicalUrl: data.seoCanonicalUrl || null,
  robots: data.seoRobots || null,
  twitterCard: data.seoTwitterCard || null,
});

/**
 * Map an existing `TagTranslation` to form data shape.
 * Reads from flat translation fields first, falls back to the `seo` relation.
 */
const translationToFormData = (translation: TagTranslation): TranslationFormData => ({
  language: translation.language as SupportedLang,
  name: translation.name,
  slug: translation.slug,
  description: translation.description ?? '',
  h1: translation.h1 ?? '',
  shortDescription: translation.shortDescription ?? '',
  faq: (translation.faq as Array<{ question: string; answer: string }>) ?? [],
  relatedCategorySlugs: arrayToTextarea(translation.relatedCategorySlugs as string[] | undefined),
  relatedCollectionSlugs: arrayToTextarea(
    translation.relatedCollectionSlugs as string[] | undefined
  ),
  seoMetaTitle: translation.metaTitle ?? translation.seo?.metaTitle ?? '',
  seoMetaDescription: translation.metaDescription ?? translation.seo?.metaDescription ?? '',
  seoCanonicalUrl: translation.seo?.canonicalUrl ?? '',
  seoRobots: translation.seo?.robots ?? 'index, follow',
  seoOgTitle: translation.ogTitle ?? translation.seo?.ogTitle ?? '',
  seoOgDescription: translation.ogDescription ?? translation.seo?.ogDescription ?? '',
  seoOgImageUrl: translation.ogImageUrl ?? translation.seo?.ogImageUrl ?? '',
  seoOgImageAlt: translation.ogImageAlt ?? '',
  seoTwitterCard:
    (translation.seo?.twitterCard as 'summary' | 'summary_large_image' | '') || 'summary',
  indexable: translation.indexable ?? true,
});

export const TagTranslationsModal = (props: TagTranslationsModalProps) => {
  const { isOpen, onClose, tag } = props;
  const { enqueueSnackbar } = useSnackbar();
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState<TranslationFormData | undefined>(undefined);

  const { data: translationsPage, isLoading } = useTagTranslations(tag.id, {
    enabled: isOpen,
  });
  const translations = translationsPage?.items ?? [];

  const createMutation = useCreateTagTranslation();
  const updateMutation = useUpdateTagTranslation();
  const deleteMutation = useDeleteTagTranslation();

  const handleEdit = (translation: TagTranslation) => {
    setEditingLang(translation.language);
    setFormData(translationToFormData(translation));
    setIsFormVisible(true);
  };

  const handleDelete = async (language: string) => {
    if (confirm('Are you sure you want to delete this translation?')) {
      await deleteMutation.mutateAsync({ id: tag.id, language });
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
      relatedCategorySlugs: '',
      relatedCollectionSlugs: '',
      seoMetaTitle: '',
      seoMetaDescription: '',
      seoCanonicalUrl: '',
      seoRobots: 'index, follow',
      seoOgTitle: '',
      seoOgDescription: '',
      seoOgImageUrl: '',
      seoOgImageAlt: '',
      seoTwitterCard: 'summary',
      indexable: true,
    });
    setIsFormVisible(true);
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
      const relatedCategorySlugs = textareaToArray(data.relatedCategorySlugs);
      const relatedCollectionSlugs = textareaToArray(data.relatedCollectionSlugs);

      if (editingLang) {
        const payload: UpdateTagTranslationRequest = {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          h1: data.h1 || undefined,
          shortDescription: data.shortDescription || null,
          metaTitle: data.seoMetaTitle || undefined,
          metaDescription: data.seoMetaDescription || null,
          ogTitle: data.seoOgTitle || undefined,
          ogDescription: data.seoOgDescription || null,
          ogImageUrl: data.seoOgImageUrl || null,
          ogImageAlt: data.seoOgImageAlt || undefined,
          faq: faq.length > 0 ? faq : undefined,
          relatedCategorySlugs,
          relatedCollectionSlugs,
          indexable: data.indexable,
          seo,
        };
        await updateMutation.mutateAsync({
          id: tag.id,
          language: editingLang,
          data: payload,
        });
      } else {
        const payload: CreateTagTranslationRequest = {
          language: data.language,
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          h1: data.h1 || undefined,
          shortDescription: data.shortDescription || null,
          metaTitle: data.seoMetaTitle || undefined,
          metaDescription: data.seoMetaDescription || null,
          ogTitle: data.seoOgTitle || undefined,
          ogDescription: data.seoOgDescription || null,
          ogImageUrl: data.seoOgImageUrl || null,
          ogImageAlt: data.seoOgImageAlt || undefined,
          faq: faq.length > 0 ? faq : undefined,
          relatedCategorySlugs,
          relatedCollectionSlugs,
          indexable: data.indexable,
          seo,
        };
        await createMutation.mutateAsync({
          id: tag.id,
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

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title={`Translations for "${tag.name}"`}
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

        {isFormVisible && formData && (
          <TranslationForm
            initialData={formData}
            availableLanguages={availableLanguages}
            isEditing={!!editingLang}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onSubmit={onSubmit}
            onCancel={handleCancelForm}
          />
        )}
      </div>
    </Modal>
  );
};
