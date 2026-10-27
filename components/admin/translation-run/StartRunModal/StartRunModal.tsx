'use client';

import { useMemo, useState, type FC } from 'react';
import { Alert, Checkbox, Input, Select, Spin } from 'antd';
import {
  RUN_MAX_LANGUAGES,
  useLlmModels,
  useLlmStageSettings,
  useStartTranslationRun,
  useTranslationRunEstimate,
} from '@/api/hooks';
import { Modal } from '@/components/admin/common/Modal';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  TranslationRun,
  TranslationRunEstimateParams,
  TranslationSource,
} from '@/types/api-schema';
import {
  isLimitOk,
  refusalText,
  stageName,
  startRunRequest,
  TARGET_REASONS,
  toModelOptions,
} from '../translationRun.utils';
import styles from './StartRunModal.module.scss';

export interface StartRunModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onStarted: (run: TranslationRun) => void;
  versionId: string;
  bookId: string;
  source: TranslationSource;
}

/**
 * Этапы, модели которых окно показывает из настроек (§2.2), в порядке работы запуска; меняется
 * на запуск только перевод.
 */
const RUN_STAGES = [
  'dossier',
  'glossary',
  'split',
  'translate',
  'check_semantic',
  'final_check',
  'metadata',
] as const;

/**
 * Окно запуска перевода (F05-7, `product.md` §2.2): несколько языков сразу с причинами
 * недоступности, модели этапов из настроек и модель перевода на этот запуск, оценка по языкам,
 * досье и глоссариям с итогом, лимит запуска. Окно запускает только перевод (D2).
 */
export const StartRunModal: FC<StartRunModalProps> = ({
  isOpen,
  onCancel,
  onStarted,
  versionId,
  bookId,
  source,
}) => {
  const settings = useLlmStageSettings();
  const models = useLlmModels();
  const [languages, setLanguages] = useState<SupportedLang[]>([]);
  const [translateModel, setTranslateModel] = useState<string | null>(null);
  const [limit, setLimit] = useState('');

  const params: TranslationRunEstimateParams | null =
    languages.length > 0 ? { languages, ...(translateModel ? { translateModel } : {}) } : null;
  const estimate = useTranslationRunEstimate(versionId, params);
  const start = useStartTranslationRun(versionId, bookId, { onSuccess: onStarted });

  const modelOptions = useMemo(() => toModelOptions(models.data?.items ?? []), [models.data]);
  const stageModels = RUN_STAGES.flatMap((stage) =>
    (settings.data?.items ?? []).filter((s) => s.stage === stage)
  );
  const translateStage = stageModels.find((s) => s.stage === 'translate');

  const toggle = (language: SupportedLang, checked: boolean) =>
    setLanguages((prev) =>
      checked ? [...prev, language].slice(0, RUN_MAX_LANGUAGES) : prev.filter((l) => l !== language)
    );

  const limitOk = isLimitOk(limit);
  // Фоновый перезапрос оценки (кэш того же выбора) - ещё не та оценка, по которой стартовать.
  const canStart =
    languages.length > 0 &&
    limitOk &&
    estimate.isSuccess &&
    !estimate.isFetching &&
    !start.isPending;

  return (
    <Modal
      isOpen={isOpen}
      title="Translate to other languages"
      size="lg"
      confirmText="Start"
      onConfirm={() => {
        if (canStart) start.mutate(startRunRequest(languages, translateModel, limit));
      }}
      onCancel={onCancel}
      isConfirmDisabled={!canStart}
      isLoading={start.isPending}
    >
      <fieldset className={styles.languages}>
        <legend>Languages</legend>
        {source.targets
          .filter((t) => t.reason !== 'IS_SOURCE')
          .map((t) => (
            <div key={t.language} className={styles.language}>
              <Checkbox
                checked={languages.includes(t.language)}
                // Отмеченный язык, ставший недоступным, снимается: иначе окно не стартует вовсе.
                disabled={!t.available && !languages.includes(t.language)}
                onChange={(e) => toggle(t.language, e.target.checked)}
              >
                {t.language.toUpperCase()}
              </Checkbox>
              {t.reason && <span className={styles.muted}>{TARGET_REASONS[t.reason]}</span>}
            </div>
          ))}
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="run-translate-model">Translation model for this run</label>
        <Select
          id="run-translate-model"
          showSearch
          allowClear
          optionFilterProp="label"
          placeholder={translateStage ? translateStage.model : settings.isError ? '' : 'Loading…'}
          options={modelOptions}
          value={translateModel ?? undefined}
          onChange={(value: string | undefined) => setTranslateModel(value ?? null)}
        />
      </div>
      <ul className={styles.stages} aria-label="Stage models">
        {stageModels
          .filter((s) => s.stage !== 'translate')
          .map((s) => (
            <li key={s.stage}>
              {stageName(s.stage)}: {s.model}
            </li>
          ))}
      </ul>
      {settings.isError && <Alert type="error" message={refusalText(settings.error)} />}
      {models.isError && <Alert type="error" message={refusalText(models.error)} />}

      {estimate.isFetching && <Spin />}
      {estimate.isError && <Alert type="error" message={refusalText(estimate.error)} />}
      {estimate.data && (
        <table className={styles.estimate}>
          <tbody>
            {estimate.data.dossier && (
              <tr>
                <td>Dossier (own limit {formatMoney(estimate.data.dossier.suggestedLimitUsd)})</td>
                <td>{formatMoney(estimate.data.dossier.estimateUsd)}</td>
              </tr>
            )}
            {estimate.data.languages.map((l) =>
              l.glossary ? (
                <tr key={`glossary-${l.language}`}>
                  <td>
                    Glossary {l.language.toUpperCase()} (own limit{' '}
                    {formatMoney(l.glossary.suggestedLimitUsd)})
                  </td>
                  <td>{formatMoney(l.glossary.estimateUsd)}</td>
                </tr>
              ) : null
            )}
            {estimate.data.languages.map((l) => (
              <tr key={l.language}>
                <td>Translation {l.language.toUpperCase()}</td>
                <td>{formatMoney(l.totalUsd)}</td>
              </tr>
            ))}
            <tr className={styles.total}>
              <td>Total{estimate.data.upperBound ? ' (upper bound)' : ''}</td>
              <td>{formatMoney(estimate.data.totalUsd)}</td>
            </tr>
          </tbody>
        </table>
      )}
      <p className={styles.muted}>
        The estimate does not include retries of pieces after a failed check.
      </p>
      {estimate.data && estimate.data.nearLimitChapters.length > 0 && (
        <Alert
          type="warning"
          message={`Chapters near the chapter length limit: ${estimate.data.nearLimitChapters.join(', ')}`}
        />
      )}

      <div className={styles.field}>
        <label htmlFor="run-limit">Run limit, $</label>
        <Input
          id="run-limit"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder={estimate.data ? formatMoney(estimate.data.defaultLimitUsd) : ''}
          status={limitOk ? undefined : 'error'}
        />
        {!limitOk && (
          <span className={styles.fieldError}>An amount in dollars, up to 8 decimals: 1.5</span>
        )}
        <span className={styles.muted}>
          Empty — the default run limit
          {estimate.data ? ` ${formatMoney(estimate.data.defaultLimitUsd)}` : ''}. The dossier and
          glossaries are paid separately with their own limits (lines above)
          {estimate.data
            ? `; the run limit is at least ${formatMoney(estimate.data.minLimitUsd)}`
            : ''}
          .
        </span>
      </div>

      {start.isError && <Alert type="error" message={refusalText(start.error)} />}
    </Modal>
  );
};
