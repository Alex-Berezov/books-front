'use client';

import { useCallback, type FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateBookWorld,
  useWorldWrite,
  useWorldWriteActions,
  useWorldWriteEstimate,
} from '@/api/hooks';
import {
  AcceptAll,
  AcceptAllOutcome,
  useAcceptAll,
  useWrittenBlocks,
  WriteRunPanel,
} from '@/components/admin/books/ContentDraft';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  WorldAcceptAllSkipped,
  WorldWrite as WorldRun,
  WorldWriteItem,
} from '@/types/api-schema';
import {
  isPending,
  progressText,
  reasonText,
  refusalText,
  skippedText,
  sortItems,
  startLossText,
  writeEstimateText,
} from './worldWrite.utils';
import { WorldWriteItemCard } from './WorldWriteItemCard';
import { WorldWriteSteps } from './WorldWriteSteps';
import draftStyles from '@/components/admin/books/ContentDraft/ContentDraft.module.scss';

export interface WorldWriteProps {
  /** Версия языка `ru` или `en`: остальные сервер отказывает (`WORLD_LANGUAGE_UNSUPPORTED`). */
  versionId: string;
  lang: SupportedLang;
}

/** Строка пропущенного пункта «Accept all» с именем героя этого хода. */
const skippedLine =
  (run: Pick<WorldRun, 'candidates'> | null) =>
  (skipped: WorldAcceptAllSkipped, item: WorldWriteItem | undefined, actionable: boolean) =>
    skippedText(run ?? { candidates: null }, skipped, item, actionable);

/**
 * Ход «Write World» (F08 `product.md` §17 п.6, только `admin`): старт с оценкой и лимитом, ход по
 * шагам («Step N of M: <шаг>», пауза с причиной и «Continue», отказ с причиной), «Discard run» на
 * паузе и после отказа, выброшенное у шагов, блоки с отметками проверки, «Accept all» с пропущенными
 * пунктами. Записи хода в мир перечитывают список и карточки вкладки (`invalidateBookWorld`).
 */
export const WorldWrite: FC<WorldWriteProps> = ({ versionId, lang }) => {
  const queryClient = useQueryClient();
  const { data, isError, refetch } = useWorldWrite(versionId, true);
  const actions = useWorldWriteActions(versionId);

  const run = data?.draft ?? null;
  const ready = run?.status === 'ready';
  const items = run ? sortItems(run.items) : [];
  // «Accept all» берёт предложения; перегенерируемые сервер не пробует.
  const acceptable = items.filter((i) => isPending(i) && !i.regenerating);
  const acceptAll = useAcceptAll<WorldAcceptAllSkipped, WorldWriteItem, WorldRun>({
    kind: 'world_write',
    versionId,
    run,
    acceptAll: actions.acceptAll,
    starting: actions.start.isPending,
  });
  const allResult = acceptAll.own;

  // Прямые записи старта и перегенерации пустого блока приходят опросом хода: вкладка перечитывает
  // список и карточки (записанное, пока вкладки не было, — на первом ответе хода).
  const onWritten = useCallback(
    () => invalidateBookWorld(queryClient, versionId),
    [queryClient, versionId]
  );
  useWrittenBlocks(versionId, data?.draft, onWritten);

  return (
    <WriteRunPanel
      versionId={versionId}
      lang={lang}
      label="Write World"
      noun="world"
      run={data === undefined ? undefined : run}
      isError={isError}
      refetch={refetch}
      actions={actions}
      start={{
        buildingHint:
          'The world of this version is being written: Write World is available when it ends.',
        rebuiltHint: 'The dossier is being rebuilt. Press Write World again when it is ready.',
        useEstimate: useWorldWriteEstimate,
        estimateText: writeEstimateText,
        loss: startLossText(run),
      }}
      progressText={progressText}
      reasonText={reasonText}
      refusalText={refusalText}
      discardMessage="Discard this world run? Its operation and regenerations stop, proposals not accepted are lost, the money spent is not returned. The entities are not touched."
      onDiscarded={acceptAll.clearOf}
    >
      {acceptAll.stopped && (
        <AcceptAllOutcome
          error={acceptAll.stopped.error}
          skipped={acceptAll.stopped.skipped}
          items={acceptAll.stopped.items}
          actionable={false}
          refusalText={refusalText}
          // Имена героев — того хода, на котором жали: перечитанный ход может быть другим.
          skippedText={skippedLine(acceptAll.stopped.run)}
        />
      )}

      {run && <WorldWriteSteps run={run} />}

      {/* Итог «Accept all» остаётся на экране и тогда, когда принимать уже нечего. */}
      {run && ready && (acceptable.length > 0 || allResult !== null) && (
        <AcceptAll
          pending={actions.acceptAll.isPending}
          disabled={isError || acceptable.length === 0}
          error={allResult?.error ?? null}
          skipped={allResult?.skipped ?? []}
          items={allResult?.items ?? run.items}
          refusalText={refusalText}
          skippedText={skippedLine(run)}
          onAcceptAll={() => void acceptAll.accept()}
        />
      )}

      {run && items.length > 0 && (
        <div className={draftStyles.items}>
          {items.map((item) => (
            <WorldWriteItemCard
              key={`${run.id}:${item.index}`}
              run={run}
              lang={lang}
              item={item}
              ready={ready}
              disabled={actions.acceptAll.isPending || isError}
              actions={actions}
              onDecided={acceptAll.clear}
            />
          ))}
        </div>
      )}
    </WriteRunPanel>
  );
};
