import type { FC } from 'react';
import {
  addMoney,
  formatMoney,
} from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { TranslationRunEstimate } from '@/types/api-schema';
import styles from './StartRunModal.module.scss';

export interface RunEstimateTableProps {
  estimate: TranslationRunEstimate;
}

/** Разделы, которые итог включает сверх перевода: Summary и Analysis со своими суммами. */
const includedText = (estimate: TranslationRunEstimate): string => {
  const parts = [
    ...(estimate.summaryUsd !== null ? [`Summary ${formatMoney(estimate.summaryUsd)}`] : []),
    ...(estimate.analysisUsd !== null ? [`Analysis ${formatMoney(estimate.analysisUsd)}`] : []),
  ];
  return parts.length > 0 ? `, including ${parts.join(' and ')}` : '';
};

/**
 * Оценка окна запуска (F05-7, `product.md` §2.2; F06-5b, §5; F07-3b): досье и глоссарии своими
 * лимитами, перевод по языкам, Summary и Analysis по языкам отдельными строками и итог — перевод
 * плюс оба раздела.
 */
export const RunEstimateTable: FC<RunEstimateTableProps> = ({ estimate }) => (
  <table className={styles.estimate}>
    <tbody>
      {estimate.dossier && (
        <tr>
          <td>Dossier (own limit {formatMoney(estimate.dossier.suggestedLimitUsd)})</td>
          <td>{formatMoney(estimate.dossier.estimateUsd)}</td>
        </tr>
      )}
      {estimate.languages.map((l) =>
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
      {estimate.languages.map((l) => (
        <tr key={l.language}>
          <td>Translation {l.language.toUpperCase()}</td>
          {/* `totalUsd` языка включает Summary и Analysis: перевод — сумма этапов. */}
          <td>
            {formatMoney(
              addMoney(l.splitUsd, l.translateUsd, l.checkUsd, l.finalCheckUsd, l.metadataUsd)
            )}
          </td>
        </tr>
      ))}
      {estimate.languages.map((l) =>
        l.summaryUsd !== null ? (
          <tr key={`summary-${l.language}`}>
            <td>Summary {l.language.toUpperCase()} (own limit)</td>
            <td>{formatMoney(l.summaryUsd)}</td>
          </tr>
        ) : null
      )}
      {estimate.languages.map((l) =>
        l.analysisUsd !== null ? (
          <tr key={`analysis-${l.language}`}>
            <td>Analysis {l.language.toUpperCase()} (own limit)</td>
            <td>{formatMoney(l.analysisUsd)}</td>
          </tr>
        ) : null
      )}
      <tr className={styles.total}>
        <td>
          Total{estimate.upperBound ? ' (upper bound)' : ''}
          {includedText(estimate)}
        </td>
        <td>{formatMoney(estimate.totalUsd)}</td>
      </tr>
    </tbody>
  </table>
);
