import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';
import type { CreateAuthorModalProps } from './CreateAuthorModal.types';
import { CreateAuthorForm } from './CreateAuthorForm';
import { useCreateAuthorModal } from './useCreateAuthorModal';

export const CreateAuthorModal: FC<CreateAuthorModalProps> = (props) => {
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
    handleConfirm,
    handleClose,
  } = useCreateAuthorModal(props);

  return (
    <Modal
      confirmText={isPending ? 'Creating...' : 'Create Author'}
      confirmVariant="primary"
      isLoading={isPending}
      isConfirmDisabled={!canSubmit}
      isOpen={isOpen}
      title="Create New Author"
      onCancel={handleClose}
      onConfirm={handleConfirm}
    >
      <CreateAuthorForm
        errors={errors}
        finalSlug={finalSlug}
        formData={formData}
        generatedSlug={generatedSlug}
        isPending={isPending}
        isValidatingSlug={isValidatingSlug}
        slugError={slugError}
        onInputChange={handleInputChange}
      />
    </Modal>
  );
};
