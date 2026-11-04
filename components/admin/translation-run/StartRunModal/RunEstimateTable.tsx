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

/**
 * Оценка окна запуска (F05-7, `product.md` §2.2; F06-5b, §5): досье и глоссарии своими лимитами,
 * перевод по языкам, Summary по языкам отдельной строкой и итог — перевод плюс Summary.
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
          {/* `totalUsd` языка с Write Summary включает его раздел: перевод — сумма этапов. */}
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
      <tr className={styles.total}>
        <td>
          Total{estimate.upperBound ? ' (upper bound)' : ''}
          {estimate.summaryUsd !== null &&
            `, including Summary ${formatMoney(estimate.summaryUsd)}`}
        </td>
        <td>{formatMoney(estimate.totalUsd)}</td>
      </tr>
    </tbody>
  </table>
);
