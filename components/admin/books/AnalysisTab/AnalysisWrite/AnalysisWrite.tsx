'use client';

import type { FC } from 'react';
import {
  useAnalysisWrite,
  useAnalysisWriteActions,
  useAnalysisWriteEstimate,
  useAnalysisWriteProposal,
  useBookAnalysis,
} from '@/api/hooks';
import { WriteRunPanel } from '@/components/admin/books/ContentDraft';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './AnalysisWrite.module.scss';
import {
  isPending,
  progressText,
  reasonText,
  refusalText,
  sortItems,
  startLossText,
  writeEstimateText,
} from './analysisWrite.utils';
import { AcceptAllOutcome, AnalysisWriteAcceptAll } from './AnalysisWriteAcceptAll';
import { AnalysisWriteCore, type AnalysisCoreState } from './AnalysisWriteCore';
import { AnalysisWriteItemCard } from './AnalysisWriteItemCard';
import { AnalysisWriteSteps } from './AnalysisWriteSteps';
import { useAcceptAll } from './useAcceptAll';
import { useWrittenBlocks } from './useWrittenBlocks';

export interface AnalysisWriteProps {
  versionId: string;
  lang: SupportedLang;
  /** Ход записал блоки анализа (или мог): вкладка перечитывает анализ — форму и ядро. */
  onBlocksWritten: () => void;
  /** Ядро сохранённого анализа, как его знает вкладка: плашка — единственный текст о ядре у admin. */
  core: AnalysisCoreState;
  /**
   * Идёт «Save analysis»: запись формы целиком (А4) легла бы поверх «Accept», «Accept all»
   * и записи «Regenerate» — они ждут её конца (обратная сторона запрета Save, Б1).
   */
  saving: boolean;
}

/**
 * Ход анализа «Write Analysis» (F07 `product.md` §5, только `admin`): старт с оценкой и лимитом,
 * ход по шагам («Step N of M: <шаг>», пауза с причиной и «Continue», отказ с причиной),
 * «Discard run» на паузе и после отказа, плашка ядра по живому `hasCore`, выброшенное у шагов,
 * блоки с отметками проверки, «Accept all» с пропущенными пунктами.
 */
export const AnalysisWrite: FC<AnalysisWriteProps> = ({
  versionId,
  lang,
  onBlocksWritten,
  core,
  saving,
}) => {
  const { data, isError, refetch } = useAnalysisWrite(versionId, true);
  // Тот же запрос, что у формы вкладки (общий ключ): сохранённые источники для «Verify facts».
  const analysis = useBookAnalysis(versionId);
  const actions = useAnalysisWriteActions(versionId);

  const run = data?.draft ?? null;
  const ready = run?.status === 'ready';
  const items = run ? sortItems(run.items) : [];
  // «Accept all» берёт предложения; перегенерируемые сервер не пробует.
  const acceptable = items.filter((i) => isPending(i) && !i.regenerating);
  const acceptAll = useAcceptAll(
    versionId,
    run,
    actions.acceptAll,
    actions.start.isPending,
    onBlocksWritten
  );
  const allResult = acceptAll.own;
  const saved = { sources: analysis.data?.sources, failed: analysis.isError };
  // Источники, проверенные этим ходом и ещё не принятые: предложение `sources`.
  const runSourcesItem =
    items.find((i) => i.target === 'sources' && isPending(i) && !i.regenerating) ?? null;
  // Один запрос на ход: карточки шага 5 получают список готовым, фоновое перечитывание (сброс
  // предложений после «Accept») прежний список не прячет.
  const runSourcesQuery = useAnalysisWriteProposal(
    run?.id ?? '',
    runSourcesItem?.index ?? -1,
    ready && runSourcesItem !== null
  );
  const runSources =
    ready && runSourcesItem !== null
      ? {
          sources: runSourcesQuery.data?.sources ?? null,
          loading: runSourcesQuery.data === undefined && runSourcesQuery.isFetching,
          failed: runSourcesQuery.data === undefined && runSourcesQuery.isError,
        }
      : null;

  useWrittenBlocks(versionId, data?.draft, onBlocksWritten);

  return (
    <WriteRunPanel
      versionId={versionId}
      lang={lang}
      label="Write Analysis"
      noun="analysis"
      run={data === undefined ? undefined : run}
      isError={isError}
      refetch={refetch}
      actions={actions}
      start={{
        buildingHint:
          'The analysis of this version is being written: Write Analysis is available when it ends.',
        rebuiltHint: 'The dossier is being rebuilt. Press Write Analysis again when it is ready.',
        useEstimate: useAnalysisWriteEstimate,
        estimateText: writeEstimateText,
        loss: startLossText(run),
      }}
      progressText={progressText}
      reasonText={reasonText}
      refusalText={refusalText}
      discardMessage="Discard this analysis run? Its operation and regenerations stop, proposals not accepted are lost, the money spent is not returned. The analysis is not touched."
      onDiscarded={acceptAll.clearOf}
      beforeProgress={<AnalysisWriteCore core={core} />}
    >
      {acceptAll.stopped && (
        <AcceptAllOutcome
          error={acceptAll.stopped.error}
          skipped={acceptAll.stopped.skipped}
          items={acceptAll.stopped.items}
          actionable={false}
        />
      )}

      {run && <AnalysisWriteSteps run={run} />}

      {/* Итог «Accept all» остаётся на экране и тогда, когда принимать уже нечего. */}
      {run && ready && (acceptable.length > 0 || allResult !== null) && (
        <AnalysisWriteAcceptAll
          pending={actions.acceptAll.isPending}
          disabled={isError || saving || acceptable.length === 0}
          error={allResult?.error ?? null}
          skipped={allResult?.skipped ?? []}
          items={allResult?.items ?? run.items}
          onAcceptAll={() => void acceptAll.accept()}
        />
      )}

      {run && items.length > 0 && (
        <div className={styles.items}>
          {items.map((item) => (
            <AnalysisWriteItemCard
              key={`${run.id}:${item.index}`}
              runId={run.id}
              lang={lang}
              item={item}
              ready={ready}
              disabled={actions.acceptAll.isPending || isError || saving}
              runSources={runSources}
              saved={saved}
              actions={actions}
              onBlocksWritten={onBlocksWritten}
              onDecided={acceptAll.clear}
            />
          ))}
        </div>
      )}
    </WriteRunPanel>
  );
};
