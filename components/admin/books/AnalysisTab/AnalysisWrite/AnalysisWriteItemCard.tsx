'use client';

import { useState, type FC } from 'react';
import {
  isRegenPaused,
  isRegenRunning,
  useAnalysisWriteProposal,
  type AnalysisWriteActions,
} from '@/api/hooks';
import { ItemCheck, ItemRegenerate, ItemResume } from '@/components/admin/books/ContentDraft';
import { Button } from '@/components/admin/common/Button';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AnalysisWriteItem } from '@/types/api-schema';
import styles from './AnalysisWrite.module.scss';
import {
  blockChangedOf,
  checkOf,
  isNothingToAdd,
  isPending,
  isRegenerable,
  itemRefusalText,
  itemTitle,
  mayHaveWritten,
  reasonText,
  refusalText,
} from './analysisWrite.utils';
import { BlockConflict } from './BlockConflict';
import { ItemContent, type RunSources, type SavedSources } from './ItemContent';

export interface AnalysisWriteItemCardProps {
  runId: string;
  lang: SupportedLang;
  item: AnalysisWriteItem;
  /** Ход готов: блоки можно принимать, отбрасывать и перегенерировать (иначе сервер ответит 409). */
  ready: boolean;
  /** Действия закрыты: идёт «Accept all» или ход не перечитывается. */
  disabled: boolean;
  /** Источники предложения `sources` этого хода — для «Verify facts» блоков шага 5. */
  runSources: RunSources | null;
  /** Сохранённые источники анализа — для «Verify facts», когда своих у хода нет. */
  saved: SavedSources;
  actions: Pick<AnalysisWriteActions, 'accept' | 'discardItem' | 'regenerate' | 'resume'>;
  /** Анализ мог измениться на сервере: вкладка перечитывает форму и ядро. */
  onBlocksWritten: () => void;
  /** «Accept» или «Discard» этого блока лёг: прежний итог «Accept all» больше не про этот ход. */
  onDecided: () => void;
}

const OUTCOME_TEXT: Partial<Record<AnalysisWriteItem['outcome'], string>> = {
  written: 'Written to the analysis.',
  proposed: 'Proposal: Accept writes it to the analysis, Discard throws it away.',
  waiting: 'The write is not decided yet.',
  accepted: 'Accepted: written to the analysis.',
  discarded: 'Discarded.',
};

/** Подсказка у «Regenerate»: заполненный блок меняется только через «Accept» (U4). */
const REGEN_HINT =
  'A filled block always comes back as a proposal; only an empty block this run owns is written at once.';

/**
 * Блок хода «Write Analysis» (F07 `product.md` §4-§5): отметка проверки, судьба, содержимое
 * предложения с «Accept» / «Discard», «Verify facts» у внешних, «Regenerate» с замечанием
 * (у связей тем и `sources` его нет). «Accept» — только по свежему содержимому: пока оно
 * перечитывается (после «Regenerate», чужого «Accept»), принимать нечего. 409
 * `ANALYSIS_BLOCK_CHANGED` — свежие данные блока и перечитывание формы.
 */
export const AnalysisWriteItemCard: FC<AnalysisWriteItemCardProps> = ({
  runId,
  lang,
  item,
  ready,
  disabled,
  runSources,
  saved,
  actions,
  onBlocksWritten,
  onDecided,
}) => {
  const [busy, setBusy] = useState(false);
  // Отказ — к той судьбе блока, на которую ответил: новая судьба отказ снимает.
  const [failure, setFailure] = useState<{ of: string; error: unknown } | null>(null);

  const wanted = ready && isPending(item) && !item.regenerating;
  const proposal = useAnalysisWriteProposal(runId, item.index, wanted);
  const fresh = wanted && proposal.data !== undefined && !proposal.isFetching && !proposal.isError;

  const id = `analysis-write-item-${item.index}`;
  const shape = `${item.outcome}|${item.regenerating}`;
  const error = failure?.of === shape ? failure.error : null;
  const changed = blockChangedOf(error);
  const locked = !ready || disabled || item.regenerating || busy;
  const nothing = isNothingToAdd(item);
  const vars = { id: runId, index: item.index };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setFailure(null);
    try {
      await action();
      return true;
    } catch (e) {
      setFailure({ of: shape, error: e });
      // Сервер мог записать (сеть, 5xx) или блок изменили: форма и ядро перечитываются.
      if (mayHaveWritten(e)) onBlocksWritten();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    // Без показанного предложения принимать нечего: иначе запрос ушёл бы без сверки отпечатка.
    if (!fresh) return;
    const expectedPrint = proposal.data.print;
    if (!(await run(() => actions.accept.mutateAsync({ ...vars, expectedPrint })))) return;
    onDecided();
    onBlocksWritten();
  };
  const discard = async () => {
    if (await run(() => actions.discardItem.mutateAsync(vars))) onDecided();
  };

  return (
    <article className={styles.item} aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`} className={styles.itemTitle}>
        {itemTitle(item)}
      </h4>
      {!nothing && <ItemCheck {...checkOf(item)} />}
      {nothing ? (
        <p className={styles.hint}>Nothing to add.</p>
      ) : item.verdict === 'failed' || item.outcome === 'none' ? (
        <p className={styles.error}>Not written: {reasonText(item.failedReason)}.</p>
      ) : (
        OUTCOME_TEXT[item.outcome] && <p className={styles.hint}>{OUTCOME_TEXT[item.outcome]}</p>
      )}
      {item.regenFailedReason && (
        <p className={styles.error}>
          Regeneration failed, the previous content is kept: {reasonText(item.regenFailedReason)}.
        </p>
      )}
      {isRegenRunning(item) && (
        <p className={styles.hint} role="status">
          Regenerating…
        </p>
      )}
      {isRegenPaused(item) && item.regenOperationId && (
        <ItemResume
          operationId={item.regenOperationId}
          pauseReason={item.regenPauseReason}
          lang={lang}
          disabled={!ready || disabled}
          resume={actions.resume}
          refusalText={refusalText}
        />
      )}
      <ItemContent
        item={item}
        content={{
          wanted,
          value: fresh ? proposal.data : undefined,
          loading: wanted && proposal.isFetching,
          error: wanted && !proposal.isFetching ? proposal.error : null,
        }}
        runSources={runSources}
        saved={saved}
      />
      {changed ? (
        <BlockConflict body={changed} />
      ) : error !== null ? (
        <p className={styles.error} role="alert">
          {itemRefusalText(error, item)}
        </p>
      ) : null}

      {ready && (
        <div className={styles.actions}>
          {isPending(item) && (
            <>
              <Button variant="primary" onClick={() => void accept()} disabled={locked || !fresh}>
                Accept
              </Button>
              <Button variant="ghost" onClick={() => void discard()} disabled={locked}>
                Discard
              </Button>
            </>
          )}
          {isRegenerable(item) && !item.regenerating && (
            <ItemRegenerate
              id={id}
              disabled={locked}
              busy={busy}
              hint={REGEN_HINT}
              onRegenerate={(remark) =>
                run(() => actions.regenerate.mutateAsync(remark ? { ...vars, remark } : vars))
              }
            />
          )}
        </div>
      )}
    </article>
  );
};
