'use client';

import { useState, type FC } from 'react';
import { Alert, Button, Input } from 'antd';
import { RichTextContent } from '@/components/common/RichTextContent';
import type { TranslationChunkActions } from '@/api/hooks';
import type { TranslationChunk } from '@/types/api-schema';
import { chunkRefusalText, editRequest } from '../translationChunks.utils';
import { PausedRetryButton, type PausedRetry } from './PausedRetryButton';
import styles from './TranslationChunks.module.scss';

export interface ChunkEditFormProps {
  chunk: TranslationChunk;
  actions: TranslationChunkActions;
  onDone: () => void;
  /** Попытка повтора на паузе: правка её отменит, потраченное не вернётся. */
  pausedRetry: PausedRetry | null;
}

const translationsOf = (chunk: TranslationChunk): Record<number, string> =>
  Object.fromEntries(chunk.blocks.map((b) => [b.n, b.translation ?? '']));

const sameTexts = (a: Record<number, string>, b: Record<number, string>): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Правка куска руками: все блоки куска по номеру, только строчная разметка (белый список
 * бэкенда, отказ — списком); при повторе на паузе — подтверждение с потраченным
 * (решение арбитра `F05 | F05-7v-b`).
 */
export const ChunkEditForm: FC<ChunkEditFormProps> = ({ chunk, actions, onDone, pausedRetry }) => {
  // Текст, с которого начали: кусок перечитывается (опрос, вторая вкладка), а `PUT` пишет все
  // блоки без сверки версии — сменившийся кусок перезаписал бы чужую правку молча.
  const [base, setBase] = useState(() => translationsOf(chunk));
  const [texts, setTexts] = useState<Record<number, string>>(base);
  const changed = !sameTexts(base, translationsOf(chunk));
  // Без правок «сохранить» пометило бы кусок «правлено руками» и переписало главу.
  const untouched = sameTexts(base, texts);
  const takeNew = () => {
    const next = translationsOf(chunk);
    setBase(next);
    setTexts(next);
  };
  const save = () =>
    actions.edit.mutate(
      { chunkId: chunk.id, data: editRequest(chunk, texts) },
      { onSuccess: onDone }
    );

  return (
    <div className={styles.form} aria-label="Edit the piece">
      <div className={styles.blocks}>
        <div className={styles.blockHead}>Original</div>
        <div className={styles.blockHead}>Translation (inline markup only)</div>
        {chunk.blocks.map((b) => (
          <EditRow
            key={b.n}
            n={b.n}
            source={b.source}
            value={texts[b.n] ?? ''}
            onChange={(v) => setTexts((t) => ({ ...t, [b.n]: v }))}
          />
        ))}
      </div>
      {changed && (
        <Alert
          className={styles.alert}
          type="warning"
          message="The piece changed after the form was opened (a retry or another edit). Take the new text before saving."
          action={
            <Button size="small" onClick={takeNew}>
              Take the new text
            </Button>
          }
        />
      )}
      <div className={styles.buttons}>
        <PausedRetryButton
          pausedRetry={pausedRetry}
          title="Save the edit?"
          disabled={changed || untouched}
          loading={actions.edit.isPending}
          onConfirm={save}
        >
          Save
        </PausedRetryButton>
        <Button onClick={onDone}>Close</Button>
      </div>
      {actions.edit.error && (
        <Alert
          className={styles.alert}
          type="error"
          message={chunkRefusalText(actions.edit.error)}
        />
      )}
    </div>
  );
};

const EditRow: FC<{
  n: number;
  source: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ n, source, value, onChange }) => (
  <>
    <div className={styles.block} data-block={n}>
      <span className={styles.blockNumber}>{n}</span>
      <RichTextContent html={source} />
    </div>
    <Input.TextArea
      aria-label={`Translation of block ${n}`}
      autoSize
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </>
);
