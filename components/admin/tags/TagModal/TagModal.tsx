'use client';

import { useEffect, type FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSnackbar } from 'notistack';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { useCreateTag, useUpdateTag } from '@/api/hooks/useTags';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { SlugInput } from '@/components/common/SlugInput';
import styles from './TagModal.module.scss';
import { tagSchema, type TagFormData, type TagModalProps } from './TagModal.types';

const MESSAGES = {
  CREATE_SUCCESS: 'Tag created successfully',
  UPDATE_SUCCESS: 'Tag updated successfully',
  SAVE_ERROR: 'Failed to save tag',
  VALIDATION_ERROR: 'Please fix form errors',
} as const;

const LABELS = {
  CREATE_TITLE: 'Create Tag',
  EDIT_TITLE: 'Edit Tag',
  NAME_PLACEHOLDER: 'e.g. Motivation',
  CANCEL: 'Cancel',
  SAVE: 'Save Changes',
  CREATE: 'Create Tag',
} as const;

export const TagModal: FC<TagModalProps> = (props) => {
  const { isOpen, onClose, tag, lang } = props;
  const { enqueueSnackbar } = useSnackbar();
  const isEditMode = !!tag;
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  });

  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();

  // Reset form when modal opens or tag changes
  useEffect(() => {
    if (isOpen) {
      if (tag) {
        reset({
          name: tag.name,
          slug: tag.slug,
        });
      } else {
        reset({
          name: '',
          slug: '',
        });
      }
    }
  }, [isOpen, tag, lang, reset]);

  const onSubmit = async (data: TagFormData) => {
    try {
      if (isEditMode && tag) {
        await updateMutation.mutateAsync({ id: tag.id, data });
        enqueueSnackbar(MESSAGES.UPDATE_SUCCESS, { variant: 'success' });
      } else {
        await createMutation.mutateAsync(data);
        enqueueSnackbar(MESSAGES.CREATE_SUCCESS, { variant: 'success' });
      }
      onClose();
    } catch (error) {
      enqueueSnackbar((error as Error).message || MESSAGES.SAVE_ERROR, { variant: 'error' });
    }
  };

  const onInvalid = (_errors: FieldErrors<TagFormData>) => {
    enqueueSnackbar(MESSAGES.VALIDATION_ERROR, { variant: 'error' });
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title={isEditMode ? LABELS.EDIT_TITLE : LABELS.CREATE_TITLE}
      showFooter={false}
    >
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <Input
            {...register('name')}
            error={!!errors.name}
            placeholder={LABELS.NAME_PLACEHOLDER}
          />
          {errors.name?.message && <span className={styles.error}>{errors.name.message}</span>}
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
                entityType="book" // Fallback
                lang={lang}
                autoGenerate
              />
            )}
          />
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} type="button">
            {LABELS.CANCEL}
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            {isEditMode ? LABELS.SAVE : LABELS.CREATE}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
