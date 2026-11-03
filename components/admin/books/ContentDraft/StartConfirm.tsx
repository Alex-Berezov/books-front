'use client';

import type { FC } from 'react';
import { ConfirmDialog } from '@/components/admin/shared';
import type { CompareContextLine, DossierContextLine } from '@/types/api-schema';

/** Оценка старта: строки досье и глоссария обязательны, остальное — у своего текста. */
interface StartEstimate {
  dossier: DossierContextLine | null;
  glossary: CompareContextLine | null;
}

export interface StartConfirmProps<T extends StartEstimate> {
  isOpen: boolean;
  title: string;
  estimate: { data: T | undefined; isError: boolean; error: unknown; isFetching: boolean };
  /** Текст оценки. */
  text: (estimate: T) => string;
  /** Что теряется стартом (прежний ход, его предложения); пусто — ничего. */
  loss?: string;
  refusalText: (error: unknown) => string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Окно старта хода из досье (F05-11, F06-3) с оценкой сверху. Без цены подтверждать нечего:
 * «Start» неактивна, пока оценка не пришла. Досье, которому старт откажет (T151), не построится:
 * старт выбросил бы прежний результат и встал.
 */
export const StartConfirm = <T extends StartEstimate>({
  isOpen,
  title,
  estimate,
  text,
  loss,
  refusalText,
  onConfirm,
  onCancel,
}: StartConfirmProps<T>): ReturnType<FC> => {
  const body = estimate.data
    ? text(estimate.data)
    : estimate.isError
      ? refusalText(estimate.error)
      : 'Estimating the cost…';
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={title}
      message={loss ? `${loss} ${body}` : body}
      confirmLabel="Start"
      isLoading={estimate.isFetching}
      isConfirmDisabled={!estimate.data || estimate.data.dossier?.refusedTooLong === true}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};
