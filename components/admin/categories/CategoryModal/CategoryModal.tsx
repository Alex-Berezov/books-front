'use client';

import { useEffect, type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { checkCategorySlugUniqueness } from '@/api/endpoints/slug-validation';
import { useCreateCategory, useUpdateCategory, useCategoriesTree } from '@/api/hooks/useCategories';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { SlugInput } from '@/components/common/SlugInput';
import styles from './CategoryModal.module.scss';
import {
  categorySchema,
  type CategoryFormData,
  type CategoryModalProps,
  CATEGORY_TYPES,
} from './CategoryModal.types';

export const CategoryModal: FC<CategoryModalProps> = (props) => {
  const { isOpen, onClose, category } = props;
  const isEditMode = !!category;
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      parentId: null,
      type: CATEGORY_TYPES[0],
    },
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { data: categoriesTree } = useCategoriesTree();

  // Reset form when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      if (category) {
        reset({
          name: category.name,
          slug: category.slug,
          parentId: category.parentId || null,
          type: (category.type as (typeof CATEGORY_TYPES)[number]) || CATEGORY_TYPES[0],
        });
      } else {
        reset({
          name: '',
          slug: '',
          parentId: null,
          type: CATEGORY_TYPES[0],
        });
      }
    }
  }, [isOpen, category, reset]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      // Validate slug uniqueness
      const slugCheck = await checkCategorySlugUniqueness(data.slug, category?.id);
      if (!slugCheck.isUnique) {
        setError('slug', {
          type: 'manual',
          message: `Slug is already taken. Suggested: ${slugCheck.suggestedSlug}`,
        });
        return;
      }

      if (isEditMode && category) {
        await updateMutation.mutateAsync({ id: category.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Flatten categories tree for select options
  // This is a simplified version, ideally we should show hierarchy
  const getCategoryOptions = () => {
    if (!categoriesTree) return [];

    const options: { label: string; value: string }[] = [];

    const traverse = (nodes: typeof categoriesTree, depth = 0) => {
      nodes.forEach((node) => {
        // Don't allow selecting itself as parent
        if (category && node.id === category.id) return;

        options.push({
          label: `${'-'.repeat(depth)} ${node.name}`,
          value: node.id,
        });

        if (node.children) {
          traverse(node.children, depth + 1);
        }
      });
    };

    traverse(categoriesTree);
    return options;
  };

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title={isEditMode ? 'Edit Category' : 'Create Category'}
      showFooter={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <Input {...register('name')} error={!!errors.name} placeholder="e.g. Fantasy" />
          {errors.name?.message && (
            <span className={styles.errorMessage}>{errors.name.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Slug</label>
          <Controller
            name="slug"
            control={control}
            render={({ field }) => (
              <SlugInput
                value={field.value}
                onChange={field.onChange}
                error={errors.slug?.message}
                sourceValue={watch('name')}
                entityType="book" // Using 'book' as a fallback since category is not supported yet in SlugInput types
                // We handle validation manually in onSubmit for now
              />
            )}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Parent Category (Optional)</label>
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <Select
                options={[{ label: 'None', value: '' }, ...getCategoryOptions()]}
                value={field.value || ''}
                onChange={(val) => field.onChange(val || null)}
                error={!!errors.parentId}
              />
            )}
          />
          {errors.parentId?.message && (
            <span className={styles.errorMessage}>{errors.parentId.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Type</label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                options={CATEGORY_TYPES.map((t) => ({ label: t, value: t }))}
                value={field.value}
                onChange={field.onChange}
                error={!!errors.type}
              />
            )}
          />
          {errors.type?.message && (
            <span className={styles.errorMessage}>{errors.type.message}</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            {isEditMode ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
