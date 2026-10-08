'use client';

import { useId, useRef, type FC, type KeyboardEvent } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';
import type { ConfirmDialogProps } from './ConfirmDialog.types';
import styles from './ConfirmDialog.module.scss';

/**
 * Окно подтверждения сайта (`LEGACY-442`).
 *
 * Повторяет вид `Modal.confirm` antd 5: иконка-предупреждение, заголовок, текст и справа
 * две кнопки; с `danger` кнопка подтверждения — красная обводка (`okType: 'danger'`).
 * Escape закрывает окно, пока не идёт действие. Клик по подложке окно не закрывает —
 * как у `Modal.confirm` (`maskClosable: false`): подтверждение не отменяется случайным
 * промахом.
 */
export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  content,
  confirmText,
  cancelText,
  loading = false,
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const contentId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Забрать фокус, замкнуть Tab внутри окна и вернуть при закрытии (`LEGACY-041`).
  useDialogFocus(dialogRef, isOpen);

  if (!isOpen) return null;

  const cancel = () => {
    if (!loading) onCancel();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    cancel();
  };

  return (
    // Подложка — не кнопка: `role="presentation"` убирает её из дерева доступности,
    // закрытие с клавиатуры даёт Escape, всплывающий из окна.
    <div className={styles.overlay} role="presentation" onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={contentId}
        tabIndex={-1}
      >
        <div className={styles.body}>
          <CircleAlert className={styles.icon} aria-hidden="true" />
          <div className={styles.text}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <div id={contentId} className={styles.content}>
              {content}
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <Button variant="secondary" className={styles.cancel} disabled={loading} onClick={cancel}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'secondary' : 'primary'}
            className={danger ? styles.danger : undefined}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
