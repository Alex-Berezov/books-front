import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Input } from 'antd';
import { Button } from '@/components/admin/common/Button';
import { Modal } from '@/components/admin/common/Modal';
import { formatBookAnalysisIssue } from '@/lib/admin/book-analysis-blocks';
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
  onImport: (data: SaveBookAnalysisRequest) => void;
  /** Текст, с которым окно открывается (заготовка из досье, F05-11); правится как обычный. */
  initialJson?: string;
}

/** Пауза в наборе перед пробой на сервере. */
const PREVIEW_DELAY_MS = 400;

const PLACEHOLDER = `{
  "language": "en",
  "mainIdea": "…",
  "themes": [{ "key": "guilt", "title": "…", "interpretation": "…" }]
}`;

/**
 * Окно «Import JSON» вкладки Analysis (`product.md` §21 п.3): ошибки формы по пути поля, неизвестные
 * ключи, язык JSON против языка версии — сразу; ненайденные главы, ссылки ключей и чего не хватает
 * до ядра — пробным сохранением на сервере. Импорт кладёт данные в форму, сохраняет «Save analysis».
 */
export const ImportAnalysisModal: FC<ImportAnalysisModalProps> = ({
  isOpen,
  onCancel,
  analyze,
  loadFailed,
  onRetryLoad,
  preview,
  onImport,
  initialJson,
}) => {
  const [jsonText, setJsonText] = useState('');

  // Итог пробы привязан к тому разбору JSON, который проверялся: «ok» прошлого текста
  // не одобряет новый, пока эффект не успел поставить «checking».
  const [checked, setChecked] = useState<{ for: unknown; result: AnalysisPreview } | null>(null);

  // Окно открылось с заготовкой — она в поле; закрытие поле очищает (`close`).
  useEffect(() => {
    if (isOpen && initialJson) setJsonText(initialJson);
  }, [isOpen, initialJson]);

  const analysis = useMemo(
    () => (analyze && jsonText.trim() ? analyze(jsonText) : null),
    [analyze, jsonText]
  );
  const data = analysis?.data ?? null;

  const [attempt, setAttempt] = useState(0);

  // Проба — полным телом на сервер, поэтому только при открытом окне и после паузы в наборе:
  // не на каждую клавишу и не из закрытого окна при правке формы.
  useEffect(() => {
    if (!isOpen || !data) {
      setChecked(null);
      return;
    }
    let cancelled = false;
    setChecked({ for: data, result: { state: 'checking' } });
    const timer = setTimeout(() => {
      void preview(data).then((result) => {
        if (!cancelled) setChecked({ for: data, result });
      });
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, data, preview, attempt]);

  const close = () => {
    setJsonText('');
    onCancel();
  };

  const check = checked && checked.for === data ? checked.result : null;

  const handleConfirm = () => {
    if (!data || check?.state !== 'ok') return;
    onImport(data);
    close();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Import analysis JSON"
      confirmText="Import into form"
      confirmVariant="primary"
      isConfirmDisabled={!data || check?.state !== 'ok'}
      onCancel={close}
      onConfirm={handleConfirm}
      size="lg"
    >
      <div className={styles.section}>
        <p className={styles.hint}>
          Paste JSON from the analysis prompt. Blocks missing from the JSON stay as they are; null,
          &quot;&quot; or [] clears a block; a list replaces the previous one entirely.
        </p>
        <Input.TextArea
          rows={12}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={PLACEHOLDER}
          className={styles.jsonTextarea}
          aria-label="Import analysis JSON"
        />
        {!analyze && !loadFailed && (
          <p className={styles.hint} role="status">
            Loading validation…
          </p>
        )}
        {!analyze && loadFailed && (
          <div className={styles.error} role="alert">
            <p>Could not load data validation.</p>
            <Button type="button" variant="secondary" size="sm" onClick={onRetryLoad}>
              Retry
            </Button>
          </div>
        )}
        {analysis && analysis.errors.length > 0 && (
          <div className={styles.error} role="alert">
            <p>Errors, nothing will be imported:</p>
            <ul className={styles.issueList}>
              {analysis.errors.map((issue, idx) => (
                <li key={idx}>{formatBookAnalysisIssue(issue)}</li>
              ))}
            </ul>
          </div>
        )}
        {data && analysis && analysis.cleared.length > 0 && (
          <div className={styles.status}>
            <p>These filled blocks will be cleared:</p>
            <ul className={styles.issueList}>
              {analysis.cleared.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        )}
        {data && analysis && analysis.replaced.length > 0 && (
          <div className={styles.status}>
            <p>
              {initialJson && jsonText === initialJson
                ? 'These filled blocks will be replaced by the draft (the draft keeps the saved items and fields inside them):'
                : 'These filled blocks will be replaced entirely:'}
            </p>
            <ul className={styles.issueList}>
              {analysis.replaced.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        )}
        {check?.state === 'checking' && (
          <p className={styles.hint} role="status">
            Checking against the version…
          </p>
        )}
        {check?.state === 'rejected' && (
          <div className={styles.error} role="alert">
            <p>The server rejected the data, nothing will be imported:</p>
            <ul className={styles.issueList}>
              {check.message.split('\n').map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {check?.state === 'failed' && (
          <div className={styles.error} role="alert">
            <p>Could not check the data against the version: {check.message}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Retry check
            </Button>
          </div>
        )}
        {check?.state === 'ok' && <AnalysisCheckSummary check={check.check} />}
      </div>
    </Modal>
  );
};
