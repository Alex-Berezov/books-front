import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useCreateTagTranslation,
  useDeleteTagTranslation,
  useTagTranslations,
  useUpdateTagTranslation,
} from '@/api/hooks/useTags';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import {
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  SUPPORTED_LANGS,
  type SupportedLang,
} from '@/lib/i18n/lang';
import type { Tag, TagTranslation } from '@/types/api-schema';
import { TranslationForm } from './TranslationForm';
import { TranslationsList } from './TranslationsList';
import type { TranslationFormData } from './TagTranslationsModal.types';
import styles from './TagTranslationsModal.module.scss';

interface TagTranslationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: Tag;
}

export const TagTranslationsModal = (props: TagTranslationsModalProps) => {
  const { isOpen, onClose, tag } = props;
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState<TranslationFormData | undefined>(undefined);

  const { data: translations = [], isLoading } = useTagTranslations(tag.id, {
    enabled: isOpen,
  });

  const createMutation = useCreateTagTranslation();
  const updateMutation = useUpdateTagTranslation();
  const deleteMutation = useDeleteTagTranslation();

  const handleEdit = (translation: TagTranslation) => {
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
      await deleteMutation.mutateAsync({ id: tag.id, language });
    }
  };

  const availableLanguages = SUPPORTED_LANGS.filter(
    (lang) =>
      lang !== 'en' && (!translations.some((t) => t.language === lang) || lang === editingLang)
  ).map((lang) => ({
    value: lang,
    label: `${LANGUAGE_FLAGS[lang]} ${LANGUAGE_LABELS[lang]}`,
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

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setEditingLang(null);
    setFormData(undefined);
  };

  const onSubmit = async (data: TranslationFormData) => {
    try {
      if (editingLang) {
        await updateMutation.mutateAsync({
          id: tag.id,
          language: editingLang,
          data: {
            name: data.name,
            slug: data.slug,
          },
        });
      } else {
        await createMutation.mutateAsync({
          id: tag.id,
          data,
        });
      }
      handleCancelForm();
    } catch (error) {
      console.error('Failed to save translation:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title={`Translations for "${tag.name}"`}
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
