'use client';

import { useEffect, type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select as AntdSelect } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { checkCategorySlugUniqueness } from '@/api/endpoints/slug-validation';
import { useCreateCategory, useUpdateCategory, useCategoriesTree } from '@/api/hooks/useCategories';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { SlugInput } from '@/components/common/SlugInput';
import styles from './CategoryModal.module.scss';
import {
  categorySchema,
  type CategoryFormData,
  type CategoryModalProps,
} from './CategoryModal.types';

export const CategoryModal: FC<CategoryModalProps> = (props) => {
  const { isOpen, onClose, category, initialParentId, type } = props;
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
      parentId: initialParentId || null,
      type,
    },
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const { data: categoriesTree } = useCategoriesTree(type);

  // Reset form when modal opens or category changes
  useEffect(() => {
    if (isOpen) {
      if (category) {
        reset({
          name: category.name,
          slug: category.slug,
          parentId: category.parentId || null,
          type,
        });
      } else {
        reset({
          name: '',
          slug: '',
          parentId: initialParentId || null,
          type,
        });
      }
    }
  }, [isOpen, category, initialParentId, reset, type]);

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
          <label className={styles.label} htmlFor="category-name-input">
            Name
          </label>
          <Input
            id="category-name-input"
            {...register('name')}
            error={!!errors.name}
            placeholder="e.g. Fantasy"
          />
          {errors.name?.message && (
            <span className={styles.errorMessage}>{errors.name.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-slug-input">
            Slug
          </label>
          <Controller
            name="slug"
            control={control}
            render={({ field }) => (
              <SlugInput
                id="category-slug-input"
                value={field.value}
                onChange={field.onChange}
                error={errors.slug?.message}
                sourceValue={watch('name')}
                entityType="category"
                // We handle validation manually in onSubmit for now
              />
            )}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-parent-select">
            Parent Category (Optional)
          </label>
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <AntdSelect
                showSearch
                id="category-parent-select"
                placeholder="Select parent category"
                optionFilterProp="label"
                style={{ width: '100%' }}
                size="large"
                value={field.value || undefined}
                onChange={(val) => field.onChange(val || null)}
                onBlur={field.onBlur}
                options={[{ label: 'None', value: '' }, ...getCategoryOptions()]}
                status={errors.parentId ? 'error' : undefined}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            )}
          />
          {errors.parentId?.message && (
            <span className={styles.errorMessage}>{errors.parentId.message}</span>
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
