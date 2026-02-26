import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useCategoryTranslations,
  useCreateCategoryTranslation,
  useDeleteCategoryTranslation,
  useUpdateCategoryTranslation,
} from '@/api/hooks/useCategories';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { LANGUAGE_LABELS, SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { TranslationFormData } from './CategoryTranslationsModal.types';
import type { Category, CategoryTranslation } from '@/types/api-schema';
import styles from './CategoryTranslationsModal.module.scss';
import { TranslationForm } from './TranslationForm';
import { TranslationsList } from './TranslationsList';

interface CategoryTranslationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
}

export const CategoryTranslationsModal = (props: CategoryTranslationsModalProps) => {
  const { isOpen, onClose, category } = props;
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState<TranslationFormData | undefined>(undefined);

  const { data: translations = [], isLoading } = useCategoryTranslations(category.id, {
    enabled: isOpen,
  });

  const createMutation = useCreateCategoryTranslation();
  const updateMutation = useUpdateCategoryTranslation();
  const deleteMutation = useDeleteCategoryTranslation();

  const handleEdit = (translation: CategoryTranslation) => {
    setEditingLang(translation.language);
    setFormData({
      language: translation.language as SupportedLang,
      name: translation.name,
      slug: translation.slug,
    });
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
      if (editingLang) {
        await updateMutation.mutateAsync({
          id: category.id,
          language: editingLang,
          data: {
            name: data.name,
            slug: data.slug,
          },
        });
      } else {
        await createMutation.mutateAsync({
          id: category.id,
          data,
        });
      }
      handleCancelForm();
    } catch (error) {
      console.error('Failed to save translation:', error);
    }
  };

  const availableLanguages = SUPPORTED_LANGS.filter(
    (lang) =>
      lang !== 'en' && (!translations.some((t) => t.language === lang) || lang === editingLang)
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
    });
    setIsFormVisible(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title={`Translations for "${category.name}"`}
      size="lg"
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
            onSubmit={onSubmit}
            onCancel={handleCancelForm}
          />
        )}
      </div>
    </Modal>
  );
};
