'use client';

import { useState, type FC } from 'react';
import { useSummaryWriteEstimate, type SummaryWriteActions } from '@/api/hooks';
import { StartConfirm, StartRefusal } from '@/components/admin/books/ContentDraft';
import { Button } from '@/components/admin/common/Button';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SummaryWrite } from '@/types/api-schema';
import styles from './SummaryWrite.module.scss';
import { refusalText, startLossText, writeEstimateText } from './summaryWrite.utils';

export interface SummaryWriteStartProps {
  versionId: string;
  lang: SupportedLang;
  /** Последний ход версии; `null` — хода нет. */
  run: SummaryWrite | null;
  actions: Pick<SummaryWriteActions, 'start' | 'rebuildDossier'>;
}

/**
 * «Write Summary» (F06 `product.md` §5): оценка и лимит перед стартом, как у заготовки Analysis;
 * неактивна, пока ход пишется; окно называет, что теряет новый старт поверх готового хода
 * (непринятые предложения, идущие перегенерации). Отказ старта — словами, `DOSSIER_STALE` —
 * «Rebuild dossier».
 */
export const SummaryWriteStart: FC<SummaryWriteStartProps> = ({
  versionId,
  lang,
  run,
  actions,
}) => {
  const [confirming, setConfirming] = useState(false);
  const estimate = useSummaryWriteEstimate(versionId, confirming);
  const building = run?.status === 'building';

  const open = () => {
    actions.start.reset();
    actions.rebuildDossier.reset();
    setConfirming(true);
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={open}
        loading={actions.start.isPending}
        disabled={building || actions.start.isPending}
      >
        Write Summary
      </Button>
      {building && (
        <p className={styles.hint}>
          The summary of this version is being written: Write Summary is available when it ends.
        </p>
      )}
      <StartRefusal
        versionId={versionId}
        lang={lang}
        startError={actions.start.error}
        estimateError={estimate.error}
        rebuildDossier={actions.rebuildDossier}
        refusalText={refusalText}
        rebuiltHint="The dossier is being rebuilt. Press Write Summary again when it is ready."
      />
      <StartConfirm
        isOpen={confirming}
        title="Write Summary"
        estimate={estimate}
        text={writeEstimateText}
        loss={startLossText(run)}
        refusalText={refusalText}
        onConfirm={() => {
          setConfirming(false);
          actions.start.mutate({});
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
};
