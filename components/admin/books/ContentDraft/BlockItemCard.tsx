'use client';

import type { ReactNode } from 'react';
import { isRegenRunning } from '@/api/hooks';
import type { ItemResumeProps } from './ItemResume';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SummaryWriteReview } from '@/types/api-schema';
import { BlockConflict } from './BlockConflict';
import styles from './ContentDraft.module.scss';
import { isNothingToAdd, isPending } from './contentDraft.utils';
import { DraftItemCard, useDraftItemAction, type DraftCardItem } from './DraftItemCard';
import { ItemCheck } from './ItemCheck';

/** Блок хода анализа или мира, как его видит общая карточка. */
export interface BlockCardItem extends DraftCardItem {
  index: number;
  step: number;
  outcome: string;
  verdict: 'ok' | 'flags' | 'failed';
  failedReason: string | null;
  regenFailedReason: string | null;
}

/** Содержимое предложения, как его видит карточка: свежее, перечитывается или отказ. */
export interface ProposalContent<V> {
  /** Блок — предложение готового хода: содержимое запрашивается. */
  wanted: boolean;
  /** Свежее содержимое; `undefined` — нет или перечитывается (старое не показывается). */
  value: V | undefined;
  loading: boolean;
  error: unknown;
  /** Прочитать содержимое снова (после отказа). */
  retry: () => void;
}

/** Запрос содержимого предложения своего хода (`GET content-drafts/:id/items/:index`). */
type UseProposal<V> = (
  runId: string,
  index: number,
  enabled: boolean
) => {
  data: V | undefined;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

interface AsyncAction<V> {
  mutateAsync: (vars: V) => Promise<unknown>;
}

export interface BlockItemCardProps<I extends BlockCardItem, V extends { print: string }> {
  runId: string;
  lang: SupportedLang;
  item: I;
  /** Префикс id карточки: `analysis-write-item`, `world-write-item`. */
  idPrefix: string;
  title: string;
  /** Отметка проверки — правило своего хода (что из замечаний показывать). */
  check: {
    verdict: 'ok' | 'flags' | 'failed';
    remarks: { code: string; where: string; note: string; by: 'code' | 'model' }[];
    review: SummaryWriteReview | null;
  };
  /** Ход готов: блоки можно принимать, отбрасывать и перегенерировать (иначе сервер ответит 409). */
  ready: boolean;
  /** Действия закрыты: идёт «Accept all», ход не перечитывается, идёт запись формы. */
  disabled: boolean;
  useProposal: UseProposal<V>;
  actions: {
    accept: AsyncAction<{ id: string; index: number; expectedPrint: string }>;
    discardItem: AsyncAction<{ id: string; index: number }>;
    regenerate: AsyncAction<{ id: string; index: number; remark?: string }>;
    resume: ItemResumeProps['resume'];
  };
  /** У блока есть «Regenerate» (не у всех: связи тем, `sources`, формы имени). */
  regenerable: boolean;
  regenHint: string;
  /** Судьба блока словами: записан сразу, предложение, решение редактора. */
  outcomeText: Partial<Record<string, string>>;
  reasonText: (reason: string | null) => string;
  refusalText: (error: unknown) => string;
  /** Отказ действия словами (по умолчанию — `refusalText`). */
  errorText?: (error: unknown) => string;
  /** Тело 409 «блок изменили после предложения»; другой отказ — `null`. */
  blockChangedOf: (error: unknown) => { current: unknown } | null;
  /** Действие отказало: вкладка решает, перечитать ли записанное. */
  onActionError?: (error: unknown) => void;
  /** «Accept» лёг. */
  onAccepted?: () => void;
  /** «Accept» или «Discard» лёг: прежний итог «Accept all» больше не про этот ход. */
  onDecided: () => void;
  /** Содержимое предложения и что к нему (источники, «Verify facts») — правило своего хода. */
  content: (content: ProposalContent<V>) => ReactNode;
}

/**
 * Блок хода анализа или мира (F07 `product.md` §4-§5, F08 §17 п.6) на общем каркасе: отметка
 * проверки, судьба («Nothing to add», «Not written», записан, предложение), неудачная и идущая
 * перегенерация, содержимое предложения из `GET content-drafts/:id/items/:index`, «Accept» только
 * по свежему содержимому и с его отпечатком (`expectedPrint`), 409 «блок изменили» — что в нём сейчас.
 */
export const BlockItemCard = <I extends BlockCardItem, V extends { print: string }>({
  runId,
  lang,
  item,
  idPrefix,
  title,
  check,
  ready,
  disabled,
  useProposal,
  actions,
  regenerable,
  regenHint,
  outcomeText,
  reasonText,
  refusalText,
  errorText = refusalText,
  blockChangedOf,
  onActionError,
  onAccepted,
  onDecided,
  content,
}: BlockItemCardProps<I, V>) => {
  const { busy, error, act } = useDraftItemAction(`${item.outcome}|${item.regenerating}`);
  const wanted = ready && isPending(item) && !item.regenerating;
  const proposal = useProposal(runId, item.index, wanted);
  const fresh = wanted && proposal.data !== undefined && !proposal.isFetching && !proposal.isError;
  const changed = blockChangedOf(error);
  const nothing = isNothingToAdd(item);
  const vars = { id: runId, index: item.index };
  const id = `${idPrefix}-${item.index}`;

  const run = (action: () => Promise<unknown>) =>
    act(action, (e) => {
      onActionError?.(e);
      return false;
    });
  const accept = async () => {
    // Без показанного предложения принимать нечего: иначе запрос ушёл бы без сверки отпечатка.
    if (!fresh || proposal.data === undefined) return;
    const expectedPrint = proposal.data.print;
    if (!(await run(() => actions.accept.mutateAsync({ ...vars, expectedPrint })))) return;
    onDecided();
    onAccepted?.();
  };
  const discard = async () => {
    if (await run(() => actions.discardItem.mutateAsync(vars))) onDecided();
  };

  return (
    <DraftItemCard
      id={id}
      title={title}
      item={item}
      lang={lang}
      ready={ready}
      disabled={disabled}
      busy={busy}
      check={nothing ? null : <ItemCheck {...check} />}
      status={
        <>
          {nothing ? (
            <p className={styles.hint}>Nothing to add.</p>
          ) : item.verdict === 'failed' || item.outcome === 'none' ? (
            <p className={styles.error}>Not written: {reasonText(item.failedReason)}.</p>
          ) : (
            outcomeText[item.outcome] && <p className={styles.hint}>{outcomeText[item.outcome]}</p>
          )}
          {item.regenFailedReason && (
            <p className={styles.error}>
              Regeneration failed, the previous content is kept:{' '}
              {reasonText(item.regenFailedReason)}.
            </p>
          )}
          {isRegenRunning(item) && (
            <p className={styles.hint} role="status">
              Regenerating…
            </p>
          )}
        </>
      }
      body={
        <>
          {content({
            wanted,
            value: fresh ? proposal.data : undefined,
            loading: wanted && proposal.isFetching,
            error: wanted && !proposal.isFetching ? proposal.error : null,
            retry: () => void proposal.refetch(),
          })}
          {changed ? (
            <BlockConflict body={changed} />
          ) : error !== null ? (
            <p className={styles.error} role="alert">
              {errorText(error)}
            </p>
          ) : null}
        </>
      }
      resume={actions.resume}
      refusalText={refusalText}
      pending={isPending(item)}
      acceptBlocked={!fresh}
      onAccept={() => void accept()}
      onDiscard={() => void discard()}
      regenerate={
        regenerable
          ? {
              hint: regenHint,
              onRegenerate: (remark) =>
                run(() => actions.regenerate.mutateAsync(remark ? { ...vars, remark } : vars)),
            }
          : null
      }
    />
  );
};
