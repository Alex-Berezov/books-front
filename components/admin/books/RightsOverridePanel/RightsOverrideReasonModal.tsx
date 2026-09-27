import { useId } from 'react';
import type { FC, ReactNode } from 'react';
import { Modal } from '@/components/common/Modal';
import styles from './RightsOverridePanel.module.scss';
import { OVERRIDE_REASON_MAX_LENGTH } from './rightsOverridePolicy';

interface RightsOverrideReasonModalProps {
  isOpen: boolean;
  title: string;
  confirmText: string;
  reasonLabel: string;
  /** Текст предупреждения над полем причины. */
  children: ReactNode;
  reason: string;
  /** Ошибка причины; `null` — причина годится (или необязательна). */
  reasonError: string | null;
  isLoading: boolean;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RightsOverrideReasonModal: FC<RightsOverrideReasonModalProps> = ({
  isOpen,
  title,
  confirmText,
  reasonLabel,
  children,
  reason,
  reasonError,
  isLoading,
  onReasonChange,
  onConfirm,
  onCancel,
}) => {
  const fieldId = useId();
  const hintId = useId();
  // Ошибку не кричим на пустом поле до первого ввода: кнопка и так неактивна.
  const shownError = reason.length > 0 ? reasonError : null;

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      confirmText={confirmText}
      cancelText="Отмена"
      confirmVariant="danger"
      isLoading={isLoading}
      isConfirmDisabled={reasonError !== null || isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className={styles.modalWarning} role="alert">
        {children}
      </div>
      <label className={styles.fieldLabel} htmlFor={fieldId}>
        {reasonLabel}
      </label>
      <textarea
        id={fieldId}
        className={styles.textarea}
        value={reason}
        maxLength={OVERRIDE_REASON_MAX_LENGTH}
        rows={5}
        aria-describedby={hintId}
        aria-invalid={shownError ? true : undefined}
        disabled={isLoading}
        onChange={(event) => onReasonChange(event.target.value)}
      />
      <p className={shownError ? styles.fieldError : styles.fieldHint} id={hintId}>
        {shownError ?? `${reason.trim().length} / ${OVERRIDE_REASON_MAX_LENGTH}`}
      </p>
    </Modal>
  );
};
