import { useEffect, useRef, useState } from 'react';
import type { ContentDraftAcceptAll } from '@/types/api-schema';
import {
  contentDraftKindOf,
  refusalCode,
  skippedOfError,
  type ContentDraftKind,
} from './contentDraft.utils';

/** Ходы, у которых «Accept all» называет пропущенные пункты (`skipped`): анализ и мир. */
export type AcceptAllKind = Exclude<ContentDraftKind, 'summary_write'>;

/** Код 409 хода, который обрывает проход «Accept all»: ход не готов (новый ход, отказ, сброс). */
const NOT_READY: Record<AcceptAllKind, string> = {
  analysis_write: 'ANALYSIS_WRITE_NOT_READY',
  world_write: 'WORLD_WRITE_NOT_READY',
};

/** Ход, как его видит «Accept all». */
interface AcceptAllRun<I> {
  id: string;
  status: string;
  items: I[];
}

/** Итог последнего «Accept all» — своего хода. */
export interface AcceptAllResult<S, I, R extends AcceptAllRun<I> = AcceptAllRun<I>> {
  runId: string;
  /** Ход на момент нажатия: перечитанным может прийти другой, а имена пропущенных — из этого. */
  run: R;
  error: unknown;
  skipped: S[];
  items: I[];
}

export interface AcceptAllOptions<I, R extends AcceptAllRun<I>> {
  /** Вид хода: по нему код обрыва и разбор ответа общей ручки. */
  kind: AcceptAllKind;
  versionId: string;
  run: R | null;
  acceptAll: { mutateAsync: (id: string) => Promise<ContentDraftAcceptAll> };
  /** Идёт старт с этой панели: прежний итог снимается. */
  starting: boolean;
  /** Проход окончен в любом исходе: записанное до отказа тоже легло (анализ перечитывает форму). */
  onSettled?: () => void;
}

/**
 * «Accept all» хода анализа или мира и его итог — одно правило у обоих ходов. Обрыв (409 «не готов»)
 * означает, что ход уже не `ready`, а перечитанным может прийти другой ход или ничего: такой итог
 * отдаётся отдельно (`stopped`), иначе редактор не увидел бы ни отказа, ни причин пропуска (T174, п.1).
 */
export const useAcceptAll = <S, I, R extends AcceptAllRun<I> = AcceptAllRun<I>>({
  kind,
  versionId,
  run,
  acceptAll,
  starting,
  onSettled,
}: AcceptAllOptions<I, R>) => {
  const [result, setResult] = useState<AcceptAllResult<S, I, R> | null>(null);
  const notReady = NOT_READY[kind];
  const runId = run?.id;
  const status = run?.status;
  // Снимается своим стартом, а не видом хода: обрыв чаще всего и есть чужой новый ход `building`.
  useEffect(() => {
    if (starting) setResult(null);
  }, [starting]);
  const versionRef = useRef(versionId);
  versionRef.current = versionId;
  useEffect(() => setResult(null), [versionId]);
  // Чужой готовый ход: обрыв уже не про него и не должен вернуться, когда тот ход отбросят.
  useEffect(() => {
    if (result && status === 'ready' && result.runId !== runId) setResult(null);
  }, [result, status, runId]);

  const own = result && result.runId === runId ? result : null;
  // У готового хода итог показывает свой блок; над чужим готовым ходом обрыв уже не про него.
  const stopped =
    result && refusalCode(result.error) === notReady && status !== 'ready' ? result : null;

  const accept = async () => {
    if (!run) return;
    setResult(null);
    const calledFor = versionId;
    // Ответ, пришедший после смены версии, про прежнюю версию: на новую его не кладём.
    const pressedOn = run;
    const settle = (next: AcceptAllResult<S, I, R>) => {
      if (versionRef.current === calledFor) setResult(next);
    };
    try {
      const res = await acceptAll.mutateAsync(run.id);
      // Ручка общая у всех ходов: ответ своего вида несёт `skipped` и блоки хода.
      const answer =
        contentDraftKindOf(res) === kind ? (res as unknown as { skipped: S[]; items: I[] }) : null;
      settle({
        runId: run.id,
        run: pressedOn,
        error: null,
        skipped: answer?.skipped ?? [],
        items: answer?.items ?? run.items,
      });
    } catch (error) {
      settle({
        runId: run.id,
        run: pressedOn,
        error,
        skipped: skippedOfError<S>(error, notReady),
        items: run.items,
      });
    }
    onSettled?.();
  };

  return {
    own,
    stopped,
    accept,
    clear: () => setResult(null),
    // Сброшен ход `id`: снимается только его итог — к ответу сброса на экране может быть другой ход.
    clearOf: (id: string) => setResult((r) => (r?.runId === id ? null : r)),
  };
};
