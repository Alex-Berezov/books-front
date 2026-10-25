'use client';

import { useState, type FC } from 'react';
import { Alert, Button, Tag } from 'antd';
import { useTranslationChunkActions } from '@/api/hooks';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { findingText } from '@/components/admin/translation-run/translationRun.utils';
import { RichTextContent } from '@/components/common/RichTextContent';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { TranslationChunk } from '@/types/api-schema';
import { editedText, retryStateOf } from '../translationChunks.utils';
import { ChunkEditForm } from './ChunkEditForm';
import { RetryForm } from './RetryForm';
import { RetryStatus } from './RetryStatus';
import styles from './TranslationChunks.module.scss';

export interface ChunkCardProps {
  chunk: TranslationChunk;
  runId: string;
  lang: SupportedLang;
  /** Черновик языка и глава в нём: правка их переписывает — их кэш сбрасывается. */
  draftVersionId: string | null;
  chapterId: string | null;
  /** Черновик языка не черновик или его статус не прочитан: повтор оплачивается, глава может не переписаться. */
  notDraft: boolean;
  /** Запуск идёт: повтор и правка — 409 `RUN_ACTIVE`, кнопки неактивны. */
  runActive: boolean;
  /**
   * У куска открытой главы идёт повтор: замок пары (весь язык) держит и этот кусок — 409
   * `RETRY_IN_PROGRESS`. Повтор в другой главе отсюда не виден: тогда отказ приходит подписью.
   */
  pairBusy: boolean;
  /** С куском начали работать: экран держит его под фильтром «только флаги». */
  onTouch: () => void;
}

const CHUNK_STATUSES: Record<TranslationChunk['status'], string> = {
  pending: 'not translated yet',
  translated: 'translated, not checked',
  checked: 'checked',
  done: 'done',
  flagged: 'flagged',
};

/**
 * Кусок «оригинал | перевод» блок к блоку (F05-7v, `product.md` §2.4): статус, флаг и «почему»,
 * модель, стоимость, попытки; повтор той же или другой моделью со своим лимитом и правка
 * руками — у любого куска, флаг — признак, а не условие (решение арбитра `F05 | F05-7v`).
 * Мутации — свои у каждой карточки: отказ и итог одного куска не переезжают на соседний.
 */
export const ChunkCard: FC<ChunkCardProps> = ({
  chunk,
  runId,
  lang,
  draftVersionId,
  chapterId,
  notDraft,
  runActive,
  pairBusy,
  onTouch,
}) => {
  const actions = useTranslationChunkActions(runId, draftVersionId, chapterId);
  const [mode, setMode] = useState<'view' | 'retry' | 'edit'>('view');
  const retryState = retryStateOf(chunk.retry);
  const blocked = runActive || pairBusy || retryState === 'running';
  const edited = chunk.editedAt !== null;
  // Попытка на паузе: и новый повтор, и правка её отменяют — потраченное не вернётся.
  const pausedRetry = retryState === 'paused' ? { spentUsd: chunk.retry?.spentUsd ?? null } : null;
  // Отказ и итог прошлого раза к новой форме не относятся: открытие формы их снимает.
  const open = (next: 'retry' | 'edit') => {
    actions.retry.reset();
    actions.edit.reset();
    onTouch();
    setMode(next);
  };

  return (
    <article className={styles.chunk} aria-label={`Piece ${chunk.chunkIndex + 1}`}>
      <header className={styles.chunkHeader}>
        <h3 className={styles.chunkTitle}>
          Piece {chunk.chunkIndex + 1} · blocks {chunk.firstBlock}–{chunk.lastBlock}
        </h3>
        <Tag color={chunk.status === 'flagged' ? 'red' : undefined}>
          {CHUNK_STATUSES[chunk.status]}
        </Tag>
        {edited && <Tag color="blue">Edited by hand</Tag>}
        {chunk.flagReason && <span>Flag: {findingText(chunk.flagReason)}</span>}
      </header>
      <p className={edited ? styles.muted : undefined}>
        Model: {chunk.model ?? '—'} · cost {chunk.costUsd ? formatMoney(chunk.costUsd) : '—'} ·
        attempts {chunk.attempts}
        {edited && ' (before the edit by hand)'}
      </p>
      {chunk.remarks.length > 0 && (
        <div className={edited ? styles.muted : undefined}>
          <span>Why{edited ? ' (about the text before the edit)' : ''}:</span>
          <ul className={styles.remarks}>
            {chunk.remarks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <RetryStatus chunk={chunk} lang={lang} actions={actions} />
      {actions.edit.data && mode === 'view' && (
        <Alert
          className={styles.alert}
          type={actions.edit.data.reason ? 'warning' : 'success'}
          message={editedText(actions.edit.data)}
        />
      )}

      {mode === 'edit' ? (
        <ChunkEditForm
          chunk={chunk}
          actions={actions}
          onDone={() => setMode('view')}
          pausedRetry={pausedRetry}
        />
      ) : (
        <div className={styles.blocks}>
          <div className={styles.blockHead}>Original</div>
          <div className={styles.blockHead}>Translation</div>
          {chunk.blocks.map((b) => (
            <BlockRow key={b.n} n={b.n} source={b.source} translation={b.translation} />
          ))}
        </div>
      )}

      {mode === 'retry' && (
        <RetryForm
          chunk={chunk}
          notDraft={notDraft}
          pausedRetry={pausedRetry}
          actions={actions}
          onDone={() => setMode('view')}
        />
      )}
      {mode === 'view' && (
        <div className={styles.buttons}>
          <Button disabled={blocked} onClick={() => open('retry')}>
            Translate again
          </Button>
          <Button disabled={blocked} onClick={() => open('edit')}>
            Edit
          </Button>
          {runActive ? (
            <span className={styles.muted}>Pause the run to retry or edit a piece.</span>
          ) : (
            pairBusy &&
            retryState !== 'running' && (
              <span className={styles.muted}>
                Another piece of this language is being retried: wait for it to finish.
              </span>
            )
          )}
        </div>
      )}
    </article>
  );
};

const BlockRow: FC<{ n: number; source: string; translation: string | null }> = ({
  n,
  source,
  translation,
}) => (
  <>
    <div className={styles.block} data-block={n}>
      <span className={styles.blockNumber}>{n}</span>
      <RichTextContent html={source} />
    </div>
    <div className={styles.block} data-block={n}>
      {translation === null ? (
        <span className={styles.muted}>Not translated</span>
      ) : (
        <RichTextContent html={translation} />
      )}
    </div>
  </>
);
