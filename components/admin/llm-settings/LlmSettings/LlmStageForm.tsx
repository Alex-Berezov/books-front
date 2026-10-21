'use client';

import { useMemo, useState, type FC } from 'react';
import { Button, Input, Select, Switch, Tag } from 'antd';
import { useSnackbar } from 'notistack';
import { useUpdateLlmStageSetting } from '@/api/hooks';
import { ApiError } from '@/types/api';
import type { LlmModel, LlmStageSetting } from '@/types/api-schema';
import styles from './LlmSettings.module.scss';
import {
  isModelsUnavailable,
  modelOptionLabel,
  modelPriceLabel,
  toStageDraft,
  toStageRequest,
  validateStageDraft,
  type StageDraft,
} from './llmSettings.utils';

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

  const updateStage = useUpdateLlmStageSetting({
    onSuccess: () => {
      setServerError(null);
      enqueueSnackbar(`Stage ${setting.stage} saved`, { variant: 'success' });
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
    <article className={styles.stage} aria-label={`Stage ${setting.stage}`}>
      <header className={styles.stageHeader}>
        <h3 className={styles.stageTitle}>{setting.stage}</h3>
        <Tag color={setting.source === 'override' ? 'blue' : 'default'}>
          {setting.source === 'override' ? 'Saved in admin' : 'Stage default'}
        </Tag>
      </header>

      <div className={styles.stageGrid}>
        <div className={styles.field}>
          <label htmlFor={inputId('model')} className={styles.fieldLabel}>
            Model
          </label>
          <Select
            id={inputId('model')}
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
