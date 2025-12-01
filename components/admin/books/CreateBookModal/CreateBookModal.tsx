/**
 * Modal for creating a new book
 *
 * Allows admin to enter book title and author,
 * automatically generates slug and validates its uniqueness.
 */

'use client';

import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';
import type { CreateBookModalProps } from './CreateBookModal.types';
import { CreateBookForm } from './CreateBookForm';
import { useCreateBookModal } from './useCreateBookModal';

/**
 * Modal component for creating new book
 *
 * Features:
 * - Title and author input fields
 * - Automatic slug generation from title
 * - Slug uniqueness validation
 * - Loading states and error handling
 */
export const CreateBookModal: FC<CreateBookModalProps> = (props) => {
  const { isOpen } = props;
  const {
    formData,
    errors,
    generatedSlug,
    finalSlug,
    slugError,
    isValidatingSlug,
    isPending,
    canSubmit,
    handleInputChange,
    handleSubmit,
    handleConfirm,
    handleClose,
  } = useCreateBookModal(props);

  return (
    <Modal
      confirmText={isPending ? 'Creating...' : 'Create Book'}
      confirmVariant="primary"
      isLoading={isPending}
      isConfirmDisabled={!canSubmit}
      isOpen={isOpen}
      title="Create New Book"
      onCancel={handleClose}
      onConfirm={handleConfirm}
    >
      <CreateBookForm
        errors={errors}
        finalSlug={finalSlug}
        formData={formData}
        generatedSlug={generatedSlug}
        isPending={isPending}
        isValidatingSlug={isValidatingSlug}
        slugError={slugError}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};
