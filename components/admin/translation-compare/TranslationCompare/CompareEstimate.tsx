import type { FC } from 'react';
import { Alert } from 'antd';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { DOSSIER_REFUSED_TEXT } from '@/components/admin/translation-run/translationRun.utils';
import type { TranslationCompareEstimate } from '@/types/api-schema';
import styles from './TranslationCompare.module.scss';

/** Оценка сравнения сверху: досье и глоссарий строятся раньше своими операциями (С10, С12). */
export const CompareEstimate: FC<{ estimate: TranslationCompareEstimate }> = ({ estimate }) => (
  <>
    <dl className={styles.facts} aria-label="Estimate">
      <dt>Pieces</dt>
      <dd>{estimate.chunks}</dd>
      {estimate.dossier && (
        <>
          <dt>Dossier (built first)</dt>
          {/* Старт откажет (T151): суммы досье нет, как в окне заготовки; причина - плашкой ниже. */}
          <dd>
            {estimate.dossier.refusedTooLong
              ? 'will not be built'
              : `up to ${formatMoney(estimate.dossier.estimateUsd)}`}
          </dd>
        </>
      )}
      {estimate.glossary && (
        <>
          <dt>Glossary (built first)</dt>
          <dd>
            up to {formatMoney(estimate.glossary.estimateUsd)}
            {estimate.glossary.upperBound ? ' (rough, the dossier is not built yet)' : ''}
          </dd>
        </>
      )}
      {estimate.models.map((m) => (
        <div key={m.model} className={styles.factRow}>
          <dt>{m.model}</dt>
          <dd>up to {formatMoney(m.estimateUsd)}</dd>
        </div>
      ))}
      <dt>Split joints</dt>
      <dd>up to {formatMoney(estimate.splitUsd)}</dd>
      <dt>Suggested limit</dt>
      <dd>{formatMoney(estimate.suggestedLimitUsd)}</dd>
    </dl>
    {estimate.dossier?.refusedTooLong && (
      <Alert className={styles.alert} type="warning" message={DOSSIER_REFUSED_TEXT} />
    )}
  </>
);
