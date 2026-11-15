import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from 'antd';
import { Button } from '@/components/admin/common/Button';
import { MessageLines } from '@/components/admin/common/MessageLines';
import { Modal } from '@/components/admin/common/Modal';
import { formatDataIssue } from '@/lib/admin/data-issue';
import { errorText } from '@/lib/admin/request-errors';
import type {
  JsonImportAnalysis,
  JsonImportPreviewModalProps,
  JsonImportPreview,
} from './JsonImportPreviewModal.types';
import styles from './JsonImportPreviewModal.module.scss';

/** Пауза в наборе перед пробой на сервере. */
const PREVIEW_DELAY_MS = 400;

/**
 * Окно «Import JSON» админки (Analysis F03-1, World F08-1): ошибки формы по пути поля — сразу,
 * затем после паузы в наборе — проба на сервере (`dryRun`). Итог пробы привязан к тому разбору,
 * который проверялся: «ok» прошлого текста не одобряет новый, ответ на старый текст не
 * перетирает свежий. Подтверждение — только после удачной пробы. Проба перезапускается от
 * текста JSON, `previewKey` и повтора, а не от новой функции `preview` у родителя: перерисовка
 * вкладки не шлёт второй `dryRun` и не стирает ошибку записи.
 */
export const JsonImportPreviewModal = <
  A extends JsonImportAnalysis<unknown>,
  Ok extends { state: 'ok' },
>({
  isOpen,
  onCancel,
  title,
  confirmText,
  hint,
  placeholder,
  analyze,
  loadFailed,
  onRetryLoad,
  preview,
  previewKey,
  renderOk,
  renderAnalysis,
  onConfirm,
}: JsonImportPreviewModalProps<A, Ok>): ReactElement => {
  const [jsonText, setJsonText] = useState('');
  const [checked, setChecked] = useState<{
    for: string;
    key: unknown;
    result: JsonImportPreview<Ok>;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const analysis = useMemo(
    () => (analyze && jsonText.trim() ? analyze(jsonText) : null),
    [analyze, jsonText]
  );
  const data = (analysis?.data ?? null) as NonNullable<A['data']> | null;
  // Что проверяется: текст JSON, который разобрался в данные; `null` — проверять нечего.
  const checkedText = data ? jsonText : null;
  const dataRef = useRef(data);
  dataRef.current = data;
  const previewRef = useRef(preview);
  previewRef.current = preview;

  // Проба — полным телом на сервер, поэтому только при открытом окне и после паузы в наборе:
  // не на каждую клавишу и не из закрытого окна при правке формы.
  useEffect(() => {
    setSaveError(null);
    const current = dataRef.current;
    if (!isOpen || checkedText === null || !current) {
      setChecked(null);
      return;
    }
    let cancelled = false;
    setChecked({ for: checkedText, key: previewKey, result: { state: 'checking' } });
    const timer = setTimeout(() => {
      void previewRef.current(current).then((result) => {
        if (!cancelled) setChecked({ for: checkedText, key: previewKey, result });
      });
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, checkedText, previewKey, attempt]);

  const close = () => {
    setJsonText('');
    setSaveError(null);
    onCancel();
  };

  const check =
    checked && checked.for === checkedText && Object.is(checked.key, previewKey)
      ? checked.result
      : null;
  const canConfirm = !!data && check?.state === 'ok' && !saving;

  const handleConfirm = () => {
    if (!data || !canConfirm) return;
    const result = onConfirm(data);
    if (!result) {
      close();
      return;
    }
    setSaving(true);
    setSaveError(null);
    // Отказ промиса — не необработанное отклонение: окно остаётся открытым с причиной.
    void Promise.resolve(result).then(
      (res) => {
        setSaving(false);
        if (res.ok) close();
        else setSaveError(res.message);
      },
      (error: unknown) => {
        setSaving(false);
        setSaveError(errorText(error, 'Import failed'));
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      confirmText={confirmText}
      confirmVariant="primary"
      isConfirmDisabled={!canConfirm}
      isLoading={saving}
      onCancel={close}
      onConfirm={handleConfirm}
      size="lg"
    >
      <div className={styles.section}>
        <p className={styles.hint}>{hint}</p>
        <Input.TextArea
          rows={12}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={placeholder}
          className={styles.jsonTextarea}
          aria-label={title}
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
                <li key={idx}>{formatDataIssue(issue)}</li>
              ))}
            </ul>
          </div>
        )}
        {data && analysis && renderAnalysis?.(analysis)}
        {check?.state === 'checking' && (
          <p className={styles.hint} role="status">
            Checking against the version…
          </p>
        )}
        {check?.state === 'rejected' && (
          <div className={styles.error} role="alert">
            <p>The server rejected the data, nothing will be imported:</p>
            <MessageLines text={check.message} />
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
        {check?.state === 'ok' && renderOk(check as Ok)}
        {saveError && (
          <div className={styles.error} role="alert">
            <p>Nothing was imported:</p>
            <MessageLines text={saveError} />
          </div>
        )}
      </div>
    </Modal>
  );
};
