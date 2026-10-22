'use client';

import { useState, type FC } from 'react';
import { Alert, Button, Input, Popconfirm } from 'antd';
import { useCompareOperation } from '@/api/hooks';
import {
  formatMoney,
  isValidMoney,
} from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { RichTextContent } from '@/components/common/RichTextContent';
import type { TranslationCompare } from '@/types/api-schema';
import styles from './TranslationCompare.module.scss';
import { operationText, refusalText, resultText } from './translationCompare.utils';

/**
 * Колонки «оригинал + модели»: текст модели — только целиком готовая глава. Сравнение на паузе
 * продолжается с первого несделанного куска (С9), сделанное повторно не оплачивается; идущее
 * и приостановленное можно отменить.
 */
export const CompareResult: FC<{ compare: TranslationCompare }> = ({ compare }) => {
  const { cancel, resume } = useCompareOperation(compare);
  const [limit, setLimit] = useState('');
  const op = compare.operation;
  const limitOk = limit.trim() === '' || isValidMoney(limit);
  const stoppable = op.status === 'active' || op.status === 'paused';
  const error = resume.error ?? cancel.error;

  return (
    <section className={styles.section} aria-label="Compare result">
      <h2 className={styles.sectionTitle}>
        Chapter {compare.chapterNumber}
        {compare.chapterTitle ? `. ${compare.chapterTitle}` : ''} → {compare.language.toUpperCase()}
      </h2>
      <p>
        {operationText(op, compare.waitingForContext)} · spent {formatMoney(op.spentUsd)} of{' '}
        {formatMoney(op.limitUsd)} (translations; the dossier and glossary have their own
        operations)
      </p>
      {stoppable && (
        <div className={styles.actions}>
          {op.status === 'paused' && (
            <>
              <label htmlFor={`compare-resume-limit-${compare.id}`}>New limit, $ (optional)</label>
              <Input
                id={`compare-resume-limit-${compare.id}`}
                className={styles.limitInput}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                status={limitOk ? undefined : 'error'}
              />
              <Button
                type="primary"
                disabled={!limitOk}
                loading={resume.isPending}
                onClick={() =>
                  resume.mutate({ id: op.id, ...(limit.trim() ? { limitUsd: limit.trim() } : {}) })
                }
              >
                Continue
              </Button>
            </>
          )}
          <Popconfirm
            title="Cancel this compare?"
            okText="Cancel compare"
            cancelText="Keep running"
            onConfirm={() => cancel.mutate(op.id)}
          >
            <Button danger loading={cancel.isPending}>
              Cancel compare
            </Button>
          </Popconfirm>
        </div>
      )}
      {error && <Alert className={styles.alert} type="error" message={refusalText(error)} />}
      <div className={styles.columns}>
        <article className={styles.column} aria-label="Original">
          <h3 className={styles.columnTitle}>Original</h3>
          {compare.originalHtml === null ? (
            <p>The chapter is gone.</p>
          ) : (
            <RichTextContent html={compare.originalHtml} />
          )}
        </article>
        {compare.results.map((r) => (
          <article key={r.model} className={styles.column} aria-label={r.model}>
            <h3 className={styles.columnTitle}>{r.model}</h3>
            <p className={styles.muted}>
              {resultText(r, op)} · {formatMoney(r.costUsd)} · {r.inputTokens} in / {r.outputTokens}{' '}
              out · {(r.durationMs / 1000).toFixed(1)} s
              {compare.chunks !== null ? ` · ${r.chunksDone}/${compare.chunks} pieces` : ''}
            </p>
            {r.html !== null && <RichTextContent html={r.html} />}
          </article>
        ))}
      </div>
    </section>
  );
};
