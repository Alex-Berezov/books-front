'use client';

import type { FC, ReactNode } from 'react';
import { Button, Popconfirm } from 'antd';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';

/** Попытка повтора на паузе: потрачено, если операция прочитана. */
export interface PausedRetry {
  spentUsd: string | null;
}

export interface PausedRetryButtonProps {
  /** Есть попытка на паузе — действие её отменит: только через подтверждение. */
  pausedRetry: PausedRetry | null;
  /** Что спросить: «Save the edit?», «Start a new retry?». */
  title: string;
  disabled?: boolean;
  loading: boolean;
  onConfirm: () => void;
  children: ReactNode;
}

/**
 * Кнопка действия, которое отменяет попытку повтора на паузе — правка руками и новый повтор
 * (`books/src/modules/translation/retry/chunk-retry.service.ts`, отмена прежней попытки):
 * потраченное на неё не вернётся, поэтому подтверждение (решение арбитра `F05 | F05-7v-b`).
 */
export const PausedRetryButton: FC<PausedRetryButtonProps> = ({
  pausedRetry,
  title,
  disabled,
  loading,
  onConfirm,
  children,
}) =>
  pausedRetry === null ? (
    <Button type="primary" disabled={disabled} loading={loading} onClick={onConfirm}>
      {children}
    </Button>
  ) : (
    <Popconfirm
      title={title}
      description={`The paused retry of this piece is cancelled; ${
        pausedRetry.spentUsd !== null
          ? `its spent ${formatMoney(pausedRetry.spentUsd)} is not returned`
          : 'what it spent is not returned'
      }.`}
      okText="Go on"
      cancelText="Back"
      onConfirm={onConfirm}
      disabled={disabled}
    >
      <Button type="primary" disabled={disabled} loading={loading}>
        {children}
      </Button>
    </Popconfirm>
  );
