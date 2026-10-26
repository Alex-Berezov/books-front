'use client';

import { useState, type FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog } from '@/components/admin/shared';
import { htmlToPlainText } from '@/lib/utils/html-text';

export interface ApplyDraftTextProps {
  /** Rich HTML заготовки. */
  text: string;
  /** Что сейчас в поле формы. */
  current: string;
  /** Подпись поля в подтверждении. */
  field: string;
  onUse: (text: string) => void;
}

/** Сколько знаков заготовки показывает подтверждение замены. */
const EXCERPT_LENGTH = 300;

/**
 * «Подставить заготовку в поле» (F05-10, `product.md` §5.1 п.3): пустое поле заполняется сразу,
 * заполненное — только после подтверждения. Сохраняет редактор кнопкой поля.
 */
export const ApplyDraftText: FC<ApplyDraftTextProps> = ({ text, current, field, onUse }) => {
  const [confirming, setConfirming] = useState(false);
  const filled = htmlToPlainText(current) !== '';
  const plain = htmlToPlainText(text);
  const excerpt = plain.length > EXCERPT_LENGTH ? `${plain.slice(0, EXCERPT_LENGTH)}…` : plain;

  return (
    <>
      <Button variant="secondary" onClick={() => (filled ? setConfirming(true) : onUse(text))}>
        Put the draft into “{field}”
      </Button>
      <ConfirmDialog
        isOpen={confirming}
        title={`Replace “${field}”`}
        message={`“${field}” is not empty. Replace its text with the draft? The draft begins: “${excerpt}” Nothing is saved until you press Save.`}
        confirmLabel="Replace"
        isDestructive
        onConfirm={() => {
          setConfirming(false);
          onUse(text);
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
};
