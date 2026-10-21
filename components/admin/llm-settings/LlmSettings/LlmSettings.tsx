'use client';

import type { FC } from 'react';
import { Alert, Spin } from 'antd';
import { useLlmModels, useLlmStageSettings, useLlmStatus } from '@/api/hooks';
import type { LlmModel, LlmStageSetting } from '@/types/api-schema';
import { LlmBudgetPanel } from './LlmBudgetPanel';
import styles from './LlmSettings.module.scss';
import { isModelsUnavailable } from './llmSettings.utils';
import { LlmStageForm } from './LlmStageForm';

/** Один пустой массив на модуль: новый `[]` на каждый рендер пересчитывал бы мемо форм этапов. */
const NO_STAGES: LlmStageSetting[] = [];
const NO_MODELS: LlmModel[] = [];

/**
 * Экран «LLM settings» (F05-1s): состояние ключа и бюджета, модели этапов. Ни одна кнопка здесь
 * модель не зовёт (Р25). Модель этапа меняется без выката (D5).
 *
 * Все три блока рисуются по наличию данных, а не по `isSuccess`: упавший фоновый перезапрос
 * оставляет в кэше прежний ответ, и экран с несохранёнными правками не должен из-за него
 * пропадать. Ошибка показывается только там, где данных нет вовсе.
 */
export const LlmSettings: FC = () => {
  const status = useLlmStatus();
  const stages = useLlmStageSettings();
  const models = useLlmModels();

  const stageItems = stages.data?.items ?? NO_STAGES;
  const modelItems = models.data?.items ?? NO_MODELS;
  const hasStages = stageItems.length > 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>LLM settings</h1>

      {status.isPending && <Spin />}
      {status.isError && !status.data && (
        <Alert
          type="error"
          showIcon
          className={styles.alert}
          message="Could not load the LLM state"
        />
      )}
      {status.data && (
        <LlmBudgetPanel
          key={`${status.data.ceilingUsd}|${status.data.defaultRunLimitUsd}`}
          status={status.data}
        />
      )}

      <section className={styles.section} aria-labelledby="llm-stages-title">
        <h2 id="llm-stages-title" className={styles.sectionTitle}>
          Pipeline stages
        </h2>

        {models.isError && !models.data && (
          <Alert
            type="warning"
            showIcon
            className={styles.alert}
            message={
              isModelsUnavailable(models.error)
                ? 'OpenRouter model list is unavailable'
                : 'Could not load the model list'
            }
            description={
              hasStages && isModelsUnavailable(models.error)
                ? 'Models and prices cannot be chosen right now, so saving a stage will fail. Try later.'
                : 'Models and prices cannot be shown right now. Try later.'
            }
          />
        )}

        {(stages.isPending || (hasStages && models.isPending)) && <Spin />}
        {stages.isError && !stages.data && (
          <Alert
            type="error"
            showIcon
            className={styles.alert}
            message="Could not load the stages"
          />
        )}
        {stages.data && !hasStages && (
          <p className={styles.empty}>
            No pipeline stages are registered yet. Stages appear here when the translation steps
            that use them are shipped.
          </p>
        )}
        {/* Без каталога этапы всё равно видны: настройки читаются, а сохранение ответит 503
            своей плашкой. Ждём только первый ответ каталога, чтобы цены не мигали. */}
        {!models.isPending &&
          stageItems.map((setting) => (
            <LlmStageForm
              key={`${setting.stage}:${setting.updatedAt ?? 'default'}`}
              setting={setting}
              models={modelItems}
              catalogKnown={Boolean(models.data)}
            />
          ))}
      </section>
    </div>
  );
};
