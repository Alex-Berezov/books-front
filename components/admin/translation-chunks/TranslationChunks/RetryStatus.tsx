'use client';

import type { FC } from 'react';
import { Alert, Button, Popconfirm } from 'antd';
import Link from 'next/link';
import { LimitResume } from '@/components/admin/common/LimitResume';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import {
  operationPauseText,
  providerStageOf,
  stageName,
} from '@/components/admin/translation-run/translationRun.utils';
import type { TranslationChunkActions } from '@/api/hooks';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { TranslationChunk } from '@/types/api-schema';
import {
  chunkRefusalText,
  retryFailedText,
  retryStateOf,
  retryStepText,
} from '../translationChunks.utils';
import styles from './TranslationChunks.module.scss';

export interface RetryStatusProps {
  chunk: TranslationChunk;
  lang: SupportedLang;
  actions: TranslationChunkActions;
}

/**
 * Попытка повтора куска: идёт, на паузе (её «продолжить» и «отменить» — только здесь, решение
 * арбитра `F05 | F05-7v-a`), закончилась без итога, отказ или применена.
 */
export const RetryStatus: FC<RetryStatusProps> = ({ chunk, lang, actions }) => {
  const retry = chunk.retry;
  const state = retryStateOf(retry);
  if (retry === null || state === null) return null;
  const money =
    retry.spentUsd !== null && retry.limitUsd !== null
      ? ` · spent ${formatMoney(retry.spentUsd)} of ${formatMoney(retry.limitUsd)}`
      : '';
  const model = retry.model ?? retry.requestedModel ?? 'the run models';
  const operationError = actions.resumeRetry.error ?? actions.cancelRetry.error;

  return (
    <div className={styles.retry} aria-label="Retry">
      {state === 'running' && (
        <p>
          Retry in progress: {retryStepText(retry.status)}, model {model}
          {money}.
        </p>
      )}
      {state === 'ended' && (
        <p>The retry stopped without a result: translate the piece again or edit it.</p>
      )}
      {state === 'applied' && (
        <p>
          Retried with {model}, cost {formatMoney(retry.costUsd)}.
        </p>
      )}
      {state === 'failed' && (
        <p>
          The retry did not change the piece: {retryFailedText(retry.reason)}. Cost{' '}
          {formatMoney(retry.costUsd)}.
        </p>
      )}
      {state === 'paused' && (
        <>
          <p>
            The retry is paused: {operationPauseText(retry.pauseReason)}
            {retry.reasonModels.length > 0 && ` (${retry.reasonModels.join(', ')})`}
            {money}.
          </p>
          {/* Под потолком и без провайдера «продолжить» поможет только после смены настроек.
              Модель повтора меняет лишь этап перевода: другая модель — выход, только если
              отказал он; на этапе проверки — модель этапа в настройках. */}
          {retry.pauseReason === 'CEILING_REACHED' && (
            <p className={styles.muted}>
              Raise the ceiling in the{' '}
              <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link> and resume.
            </p>
          )}
          {retry.pauseReason === 'NO_COMPLIANT_PROVIDER' &&
            (providerStageOf(retry.reason) === 'translate' ? (
              <p className={styles.muted}>
                No translation model without data retention: cancel the retry and translate the
                piece again with another model, or change the{' '}
                <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link> and resume.
              </p>
            ) : (
              <p className={styles.muted}>
                Stage «{stageName(providerStageOf(retry.reason))}» has no model without data
                retention: change it in the{' '}
                <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link> and resume.
              </p>
            ))}
          <div className={styles.buttons}>
            {retry.pauseReason === 'LIMIT_REACHED' ? (
              <LimitResume
                label="New limit of the retry"
                pending={actions.resumeRetry.isPending}
                onResume={(limitUsd) =>
                  actions.resumeRetry.mutate({ id: retry.operationId, limitUsd })
                }
              >
                <span>New limit, $:</span>
              </LimitResume>
            ) : (
              <Button
                loading={actions.resumeRetry.isPending}
                onClick={() => actions.resumeRetry.mutate({ id: retry.operationId })}
              >
                Resume
              </Button>
            )}
            <Popconfirm
              title="Cancel this retry?"
              description="The piece stays as it is; spent money is not returned."
              okText="Cancel the retry"
              cancelText="Keep"
              onConfirm={() => actions.cancelRetry.mutate(retry.operationId)}
            >
              <Button danger loading={actions.cancelRetry.isPending}>
                Cancel
              </Button>
            </Popconfirm>
          </div>
        </>
      )}
      {operationError && (
        <Alert className={styles.alert} type="error" message={chunkRefusalText(operationError)} />
      )}
    </div>
  );
};
