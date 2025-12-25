import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit, Globe, Trash2, Plus, X } from 'lucide-react';

import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import {
  useCategoryTranslations,
  useCreateCategoryTranslation,
  useUpdateCategoryTranslation,
  useDeleteCategoryTranslation,
} from '@/api/hooks/useCategories';
import { SUPPORTED_LANGS, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '@/lib/i18n/lang';
import { generateSlug } from '@/lib/utils/slug';
import type { Category, CategoryTranslation } from '@/types/api-schema';

import styles from './CategoryTranslationsModal.module.scss';

interface CategoryTranslationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
}

const translationSchema = z.object({
  language: z.enum(SUPPORTED_LANGS),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
});

type TranslationFormData = z.infer<typeof translationSchema>;

export const CategoryTranslationsModal = (props: CategoryTranslationsModalProps) => {
  const { isOpen, onClose, category } = props;
  const [editingLang, setEditingLang] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const { data: translations = [], isLoading } = useCategoryTranslations(category.id, {
    enabled: isOpen,
  });

  const createMutation = useCreateCategoryTranslation();
  const updateMutation = useUpdateCategoryTranslation();
  const deleteMutation = useDeleteCategoryTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<TranslationFormData>({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      language: 'en',
      name: '',
      slug: '',
    },
  });

  const watchedName = watch('name');
  const watchedLanguage = watch('language');

  // Auto-generate slug from name
  useEffect(() => {
    if (watchedName && !editingLang) {
      setValue('slug', generateSlug(watchedName));
    }
  }, [watchedName, setValue, editingLang]);

  const handleEdit = (translation: CategoryTranslation) => {
    setEditingLang(translation.language);
    reset({
      language: translation.language as any,
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

  const handleAddNew = () => {
    setEditingLang(null);
    reset({
      language: 'en', // Default or first available
      name: '',
      slug: '',
    });
    setIsFormVisible(true);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setEditingLang(null);
    reset();
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
    (lang) => !translations.some((t) => t.language === lang) || lang === editingLang
  ).map((lang) => ({
    value: lang,
    label: `${LANGUAGE_FLAGS[lang]} ${LANGUAGE_LABELS[lang]}`,
  }));

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

            <div className={styles.translationsList}>
              {isLoading ? (
                <div>Loading...</div>
              ) : translations.length === 0 ? (
                <div className={styles.emptyState}>No translations yet</div>
              ) : (
                translations.map((translation) => (
                  <div key={translation.language} className={styles.translationItem}>
                    <div className={styles.translationInfo}>
                      <div className={styles.languageBadge}>
                        {LANGUAGE_FLAGS[translation.language as any]}{' '}
                        {LANGUAGE_LABELS[translation.language as any]}
                      </div>
                      <span className={styles.translationName}>{translation.name}</span>
                      <span className={styles.translationSlug}>{translation.slug}</span>
                    </div>
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(translation)}
                        aria-label="Edit translation"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(translation.language)}
                        aria-label="Delete translation"
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {isFormVisible && (
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formTitle}>
              {editingLang ? 'Edit Translation' : 'New Translation'}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Language</label>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={availableLanguages}
                    error={errors.language?.message}
                    disabled={!!editingLang}
                  />
                )}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <Input error={errors.name?.message} {...register('name')} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Slug</label>
              <Input error={errors.slug?.message} {...register('slug')} />
            </div>

            <div className={styles.formActions}>
              <Button variant="outline" onClick={handleCancelForm} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                Save
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
