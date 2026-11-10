'use client';

import { useState } from 'react';
import { Button } from '@/components/admin/common/Button';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CompareContextLine, DossierContextLine } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';
import { StartConfirm } from './StartConfirm';
import { StartRefusal, type RebuildDossierAction } from './StartRefusal';

/** Оценка старта: строки досье и глоссария обязательны, остальное — у своего текста. */
export interface StartEstimate {
  dossier: DossierContextLine | null;
  glossary: CompareContextLine | null;
}

/** Запрос оценки хода: свой хук у каждого хода, запрос уходит только при открытом окне. */
type UseEstimate<E> = (
  versionId: string,
  enabled: boolean
) => { data: E | undefined; isError: boolean; error: unknown; isFetching: boolean };

export interface RunStartProps<E extends StartEstimate> {
  versionId: string;
  lang: SupportedLang;
  /** Ход строится: кнопка неактивна до его конца. */
  building: boolean;
  actions: {
    start: {
      mutate: (vars: { limitUsd?: string }) => void;
      reset: () => void;
      isPending: boolean;
      error: unknown;
    };
    rebuildDossier: RebuildDossierAction & { reset: () => void };
  };
  /** Кнопка и заголовок окна: «Write Summary», «Write Analysis». */
  label: string;
  /** Подпись под неактивной кнопкой, пока ход строится. */
  buildingHint: string;
  /** Подпись после перестройки досье: какую кнопку нажать снова. */
  rebuiltHint: string;
  useEstimate: UseEstimate<E>;
  estimateText: (estimate: E) => string;
  /** Что теряет новый старт поверх готового хода; пусто — ничего. */
  loss: string;
  refusalText: (error: unknown) => string;
}

/**
 * Старт хода из досье (F06 `product.md` §5, F07 §5) — один на ход пересказа и ход анализа:
 * оценка и лимит перед стартом; неактивна, пока ход пишется; окно называет, что теряет новый
 * старт поверх готового хода. Отказ старта — словами, `DOSSIER_STALE` — «Rebuild dossier».
 */
export const RunStart = <E extends StartEstimate>({
  versionId,
  lang,
  building,
  actions,
  label,
  buildingHint,
  rebuiltHint,
  useEstimate,
  estimateText,
  loss,
  refusalText,
}: RunStartProps<E>) => {
  const [confirming, setConfirming] = useState(false);
  const estimate = useEstimate(versionId, confirming);

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
        {label}
      </Button>
      {building && <p className={styles.hint}>{buildingHint}</p>}
      <StartRefusal
        versionId={versionId}
        lang={lang}
        startError={actions.start.error}
        estimateError={estimate.error}
        rebuildDossier={actions.rebuildDossier}
        refusalText={refusalText}
        rebuiltHint={rebuiltHint}
      />
      <StartConfirm
        isOpen={confirming}
        title={label}
        estimate={estimate}
        text={estimateText}
        loss={loss}
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
