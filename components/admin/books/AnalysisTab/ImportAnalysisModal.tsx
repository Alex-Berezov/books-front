import type { FC } from 'react';
import { JsonImportPreviewModal } from '@/components/admin/common/JsonImportPreviewModal';
import type { AnalysisPreview } from './AnalysisTab.types';
import type { BookAnalysisImportAnalysis } from '@/lib/admin/book-analysis-validation';
import type { SaveBookAnalysisRequest } from '@/types/api-schema';
import { AnalysisCheckSummary } from './AnalysisCheckSummary';
import styles from './AnalysisTab.module.scss';

interface ImportAnalysisModalProps {
  isOpen: boolean;
  onCancel: () => void;
  /** Разбор формы JSON против формы вкладки; `null` — модуль проверки ещё грузится. */
  analyze: ((jsonText: string) => BookAnalysisImportAnalysis) | null;
  loadFailed: boolean;
  onRetryLoad: () => void;
  /** Пробное сохранение на сервере (решение А3): ядро, главы, ссылки ключей. */
  preview: (data: SaveBookAnalysisRequest) => Promise<AnalysisPreview>;
  /** Форма вкладки: проба сливает JSON с ней, поэтому её смена перезапускает пробу. */
  previewKey?: unknown;
  onImport: (data: SaveBookAnalysisRequest) => void;
}

const PLACEHOLDER = `{
  "language": "en",
  "mainIdea": "…",
  "themes": [{ "key": "guilt", "title": "…", "interpretation": "…" }]
}`;

type AnalysisPreviewOk = Extract<AnalysisPreview, { state: 'ok' }>;

const BlockList: FC<{ title: string; keys: string[] }> = ({ title, keys }) =>
  keys.length > 0 ? (
    <div className={styles.status}>
      <p>{title}</p>
      <ul className={styles.issueList}>
        {keys.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
    </div>
  ) : null;

/**
 * Окно «Import JSON» вкладки Analysis (`product.md` §21 п.3): ошибки формы по пути поля, неизвестные
 * ключи, язык JSON против языка версии — сразу; ненайденные главы, ссылки ключей и чего не хватает
 * до ядра — пробным сохранением на сервере. Импорт кладёт данные в форму, сохраняет «Save analysis».
 * Само окно — общее `JsonImportPreviewModal`.
 */
export const ImportAnalysisModal: FC<ImportAnalysisModalProps> = ({
  isOpen,
  onCancel,
  analyze,
  loadFailed,
  onRetryLoad,
  preview,
  previewKey,
  onImport,
}) => (
  <JsonImportPreviewModal<BookAnalysisImportAnalysis, AnalysisPreviewOk>
    isOpen={isOpen}
    onCancel={onCancel}
    title="Import analysis JSON"
    confirmText="Import into form"
    hint={
      'Paste JSON from the analysis prompt. Blocks missing from the JSON stay as they are; null, "" or [] clears a block; a list replaces the previous one entirely.'
    }
    placeholder={PLACEHOLDER}
    analyze={analyze}
    loadFailed={loadFailed}
    onRetryLoad={onRetryLoad}
    preview={preview}
    previewKey={previewKey}
    renderOk={(ok) => <AnalysisCheckSummary check={ok.check} />}
    renderAnalysis={(analysis) => (
      <>
        <BlockList title="These filled blocks will be cleared:" keys={analysis.cleared} />
        <BlockList
          title="These filled blocks will be replaced entirely:"
          keys={analysis.replaced}
        />
      </>
    )}
    onConfirm={onImport}
  />
);
