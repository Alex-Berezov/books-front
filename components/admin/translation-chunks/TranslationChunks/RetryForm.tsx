'use client';

import { useMemo, useState, type FC } from 'react';
import { Alert, Button, Select } from 'antd';
import { useLlmModels, type TranslationChunkActions } from '@/api/hooks';
import { LimitInput } from '@/components/admin/common/LimitResume';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import {
  refusalText,
  toModelOptions,
} from '@/components/admin/translation-run/translationRun.utils';
import type { TranslationChunk } from '@/types/api-schema';
import { chunkRefusalText, isRetryLimitOk, retryRequest } from '../translationChunks.utils';
import { PausedRetryButton, type PausedRetry } from './PausedRetryButton';
import styles from './TranslationChunks.module.scss';

export interface RetryFormProps {
  chunk: TranslationChunk;
  /** Черновик не черновик или его статус не прочитан: предупреждение до кнопки. */
  notDraft: boolean;
  /** Попытка на паузе: новый повтор её отменит — подтверждение с потраченным. */
  pausedRetry: PausedRetry | null;
  actions: TranslationChunkActions;
  onDone: () => void;
}

/**
 * «Перевести заново»: та же (пусто — модели запуска) или другая модель, лимит обязателен
 * и ничем не подставляется, стоимость куска — справкой (решение арбитра `F05 | F05-7v-b`).
 */
export const RetryForm: FC<RetryFormProps> = ({
  chunk,
  notDraft,
  pausedRetry,
  actions,
  onDone,
}) => {
  // Каталог нужен только окну повтора: экран без него его не грузит.
  const models = useLlmModels();
  const options = useMemo(() => toModelOptions(models.data?.items ?? []), [models.data]);
  const [model, setModel] = useState<string | null>(null);
  const [limit, setLimit] = useState('');
  const ok = isRetryLimitOk(limit);
  const limitId = `retry-limit-${chunk.id}`;

  return (
    <div className={styles.form} aria-label="Translate again">
      {notDraft && (
        <Alert
          className={styles.alert}
          type="warning"
          message="The draft is published (or its state could not be read): the retry is paid, but the chapter may not be rewritten."
        />
      )}
      <Select
        aria-label="Model of the retry"
        className={styles.select}
        allowClear
        showSearch
        placeholder="The run models"
        loading={models.isLoading}
        options={options}
        value={model}
        onChange={(v: string | undefined) => setModel(v ?? null)}
      />
      {/* Каталог не прочитан: выбрать другую модель нельзя, повтор — моделями запуска. */}
      {models.isError && (
        <Alert className={styles.alert} type="error" message={refusalText(models.error)} />
      )}
      <label htmlFor={limitId}>Limit, $</label>
      <LimitInput id={limitId} value={limit} onChange={setLimit} ok={ok} />
      <span className={styles.muted}>
        The piece cost so far: {chunk.costUsd ? formatMoney(chunk.costUsd) : '—'}.
      </span>
      <div className={styles.buttons}>
        <PausedRetryButton
          pausedRetry={pausedRetry}
          title="Start a new retry?"
          disabled={!ok}
          loading={actions.retry.isPending}
          onConfirm={() =>
            actions.retry.mutate(
              { chunkId: chunk.id, data: retryRequest(model, limit) },
              { onSuccess: onDone }
            )
          }
        >
          Start the retry
        </PausedRetryButton>
        <Button onClick={onDone}>Close</Button>
      </div>
      {actions.retry.error && (
        <Alert
          className={styles.alert}
          type="error"
          message={chunkRefusalText(actions.retry.error)}
        />
      )}
    </div>
  );
};
