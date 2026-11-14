'use client';

import { useMemo, useState, type FC } from 'react';
import { Alert, Button, Input, Select, Switch, Tag } from 'antd';
import { useSnackbar } from 'notistack';
import { useUpdateLlmStageSetting } from '@/api/hooks';
import { hasLlmStageLabel, llmStageLabel } from '@/lib/admin/llm-stages';
import { ApiError } from '@/types/api';
import type { LlmModel, LlmStageSetting } from '@/types/api-schema';
import styles from './LlmSettings.module.scss';
import {
  batchModelIds,
  type StageBatchModels,
  isModelsUnavailable,
  modelOptionLabel,
  modelPriceLabel,
  toStageDraft,
  toStageRequest,
  validateStageDraft,
  type StageDraft,
} from './llmSettings.utils';

const GUESS_REASON: Record<NonNullable<StageBatchModels['guess']>, string> = {
  no_catalog: 'model list unavailable',
  no_flag: 'the model list has no batch flag',
};

/** Заголовок предупреждения: проверенный признак или догадка по имени с причиной. */
const batchAlertTitle = ({ ids, guess }: StageBatchModels): string =>
  guess === null
    ? `Batch mode: ${ids.join(', ')}`
    : `Probably batch mode (${GUESS_REASON[guess]}, not verified): ${ids.join(', ')}`;

export interface LlmStageFormProps {
  setting: LlmStageSetting;
  models: LlmModel[];
  /** Каталог загрузился. Нет — цены неизвестны, а не «модели нет в списке». */
  catalogKnown: boolean;
}

/**
 * Одна строка этапа. Сохранение шлёт все поля: PUT сбросил бы непереданное к умолчанию.
 *
 * Черновик живёт до смены сохранённой строки: родитель даёт ключ по `updatedAt`, поэтому
 * фоновый перезапрос того же ответа правки админа не затирает.
 */
export const LlmStageForm: FC<LlmStageFormProps> = ({ setting, models, catalogKnown }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [draft, setDraft] = useState<StageDraft>(() => toStageDraft(setting));
  const [serverError, setServerError] = useState<string | null>(null);
  const label = llmStageLabel(setting.stage);
  const labelled = hasLlmStageLabel(setting.stage);

  const updateStage = useUpdateLlmStageSetting({
    onSuccess: () => {
      setServerError(null);
      enqueueSnackbar(`Stage «${label.title}» saved`, { variant: 'success' });
    },
    onError: (error) => {
      if (isModelsUnavailable(error)) {
        setServerError('OpenRouter model list is unavailable, the stage was not saved. Try later.');
        return;
      }
      // Прочие 5xx показывает глобальный тост `MutationCache`.
      if (error instanceof ApiError && error.statusCode >= 500) return;
      setServerError(error.message || 'Could not save the stage');
    },
  });

  const options = useMemo(
    () => models.map((model) => ({ value: model.id, label: modelOptionLabel(model) })),
    [models]
  );
  const modelById = useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);

  const validationError = validateStageDraft(draft, models, catalogKnown);
  const batchModels = batchModelIds(draft, models, catalogKnown);
  // Сохранять без правки нечего: у этапа на умолчаниях кода такое сохранение завело бы строку
  // и закрепило модель, запасные и «включён» — смена умолчаний в коде этап бы уже не задела.
  const unchanged = JSON.stringify(draft) === JSON.stringify(toStageDraft(setting));
  // Правка черновика снимает прошлый отказ сервера: он относился к прежнему вводу.
  const patch = (next: Partial<StageDraft>) => {
    setServerError(null);
    setDraft((prev) => ({ ...prev, ...next }));
  };

  const save = () => {
    if (validationError) return;
    updateStage.mutate({ stage: setting.stage, data: toStageRequest(draft, setting, models) });
  };

  const inputId = (field: string) => `llm-stage-${setting.stage}-${field}`;

  return (
    // Имя карточки — видимый заголовок, а не техническое имя этапа.
    <article className={styles.stage} aria-labelledby={inputId('title')}>
      <header className={styles.stageHeader}>
        <h3 id={inputId('title')} className={styles.stageTitle}>
          {label.title}
        </h3>
        <Tag color={setting.source === 'override' ? 'blue' : 'default'}>
          {setting.source === 'override' ? 'Saved in admin' : 'Stage default'}
        </Tag>
        {/* Имя с экранов запуска рядом с техническим: пауза и отчёт называют этап им. */}
        {labelled && (
          <span className={styles.stageCode}>
            {label.runName && `${label.runName} · `}
            <code>{setting.stage}</code>
          </span>
        )}
      </header>
      {label.description && <p className={styles.stageDescription}>{label.description}</p>}

      <div className={styles.stageGrid}>
        <div className={styles.field}>
          <label htmlFor={inputId('model')} className={styles.fieldLabel}>
            Model
          </label>
          <Select
            id={inputId('model')}
            className={styles.select}
            classNames={{ popup: { root: styles.modelPopup } }}
            showSearch
            optionFilterProp="label"
            options={options}
            value={draft.model}
            onChange={(model: string) => patch({ model })}
          />
          <span className={styles.hint}>
            {modelPriceLabel(modelById.get(draft.model), catalogKnown)}
          </span>
        </div>

        <div className={styles.field}>
          <label htmlFor={inputId('fallbacks')} className={styles.fieldLabel}>
            Fallback models, in order
          </label>
          <Select
            id={inputId('fallbacks')}
            className={styles.select}
            classNames={{ popup: { root: styles.modelPopup } }}
            mode="multiple"
            showSearch
            optionFilterProp="label"
            options={options.filter((option) => option.value !== draft.model)}
            value={draft.fallbacks}
            onChange={(fallbacks: string[]) => patch({ fallbacks })}
          />
          {draft.fallbacks.map((id) => (
            <span key={id} className={styles.hint}>
              {id}: {modelPriceLabel(modelById.get(id), catalogKnown)}
            </span>
          ))}
        </div>

        <div className={styles.field}>
          <label htmlFor={inputId('temperature')} className={styles.fieldLabel}>
            Temperature (empty: stage default; a saved value is pinned)
          </label>
          <Input
            id={inputId('temperature')}
            value={draft.temperature}
            inputMode="decimal"
            onChange={(event) => patch({ temperature: event.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={inputId('maxTokens')} className={styles.fieldLabel}>
            Max tokens (empty: stage default; a saved value is pinned)
          </label>
          <Input
            id={inputId('maxTokens')}
            value={draft.maxTokens}
            inputMode="numeric"
            onChange={(event) => patch({ maxTokens: event.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={inputId('maxPrice')} className={styles.fieldLabel}>
            Price cap per 1M tokens, USD (required for a model without a fixed price)
          </label>
          <Input
            id={inputId('maxPrice')}
            value={draft.maxPricePerMTok}
            inputMode="decimal"
            onChange={(event) => patch({ maxPricePerMTok: event.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={inputId('enabled')} className={styles.fieldLabel}>
            Enabled
          </label>
          <Switch
            id={inputId('enabled')}
            checked={draft.enabled}
            onChange={(enabled) => patch({ enabled })}
          />
        </div>
      </div>

      {batchModels.ids.length > 0 && (
        <Alert
          className={styles.alert}
          type="warning"
          showIcon
          message={batchAlertTitle(batchModels)}
          description={
            (batchModels.fallbackOnly
              ? 'Half price. When the main model fails, the call to these fallbacks waits for OpenRouter Batch API: usually minutes, up to 24 hours. '
              : 'Half price, but every call waits for OpenRouter Batch API: usually minutes, up to 24 hours. ' +
                'A translation calls the model piece by piece, so a book language can take days. ') +
            'OpenRouter keeps the request text for 30 days (no zero data retention).'
          }
        />
      )}
      {batchModels.unpriced.length > 0 && (
        <Alert
          className={styles.alert}
          type="warning"
          showIcon
          message={`Not used in batch mode (no fixed price): ${batchModels.unpriced.join(', ')}`}
          description="A batch model without a fixed price is skipped by the server: the next fallback answers instead."
        />
      )}

      {(validationError || serverError) && (
        <p className={styles.error} role="alert">
          {validationError ?? serverError}
        </p>
      )}

      <Button
        type="primary"
        onClick={save}
        loading={updateStage.isPending}
        disabled={Boolean(validationError) || unchanged}
      >
        Save stage
      </Button>
    </article>
  );
};
