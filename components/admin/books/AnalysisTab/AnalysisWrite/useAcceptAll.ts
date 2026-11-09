import { useEffect, useRef, useState } from 'react';
import { refusalCode } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import type { AnalysisWriteActions } from '@/api/hooks';
import type {
  AnalysisAcceptAllSkipped,
  AnalysisWrite as AnalysisRun,
  AnalysisWriteItem,
} from '@/types/api-schema';
import { skippedOfError } from './analysisWrite.utils';

/** Итог последнего «Accept all» — своего хода. */
export interface AcceptAllResult {
  runId: string;
  error: unknown;
  skipped: AnalysisAcceptAllSkipped[];
  items: AnalysisWriteItem[];
}

/**
 * «Accept all» хода анализа и его итог. Обрыв означает, что ход уже не `ready`, а перечитанным
 * может прийти и другой ход или ничего: такой итог отдаётся отдельно (`stopped`), иначе редактор
 * не увидел бы ни отказа, ни причин пропуска (T174, п.1).
 */
export const useAcceptAll = (
  versionId: string,
  run: AnalysisRun | null,
  acceptAll: AnalysisWriteActions['acceptAll'],
  starting: boolean,
  onBlocksWritten: () => void
) => {
  const [result, setResult] = useState<AcceptAllResult | null>(null);
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
    result && refusalCode(result.error) === 'ANALYSIS_WRITE_NOT_READY' && status !== 'ready'
      ? result
      : null;

  const accept = async () => {
    if (!run) return;
    setResult(null);
    const calledFor = versionId;
    // Ответ, пришедший после смены версии, про прежнюю версию: на новую его не кладём.
    const settle = (next: AcceptAllResult) => {
      if (versionRef.current === calledFor) setResult(next);
    };
    try {
      const res = await acceptAll.mutateAsync(run.id);
      // Ручка общая с ходом пересказа: ход анализа — со `steps`.
      const answer = 'steps' in res ? res : null;
      settle({
        runId: run.id,
        error: null,
        skipped: answer?.skipped ?? [],
        items: answer?.items ?? run.items,
      });
    } catch (error) {
      settle({ runId: run.id, error, skipped: skippedOfError(error), items: run.items });
    }
    // Записанное до отказа тоже в анализе: форма и ядро перечитываются в любом исходе.
    onBlocksWritten();
  };

  return { own, stopped, accept, clear: () => setResult(null) };
};
