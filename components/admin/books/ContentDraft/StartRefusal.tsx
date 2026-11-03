'use client';

import { useState, type FC } from 'react';
import Link from 'next/link';
import { useDossierEstimate } from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog } from '@/components/admin/shared';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './ContentDraft.module.scss';
import { dossierEstimateText, refusalCode } from './contentDraft.utils';

/** Перестройка досье: тот же вызов у заготовки Analysis и хода пересказа. */
export interface RebuildDossierAction {
  mutate: () => void;
  isPending: boolean;
  isSuccess: boolean;
  error: unknown;
}

export interface StartRefusalProps {
  versionId: string;
  lang: SupportedLang;
  /** Отказ старта и отказ оценки (оценка хранит его и после закрытия окна). */
  startError: unknown;
  estimateError: unknown;
  rebuildDossier: RebuildDossierAction;
  refusalText: (error: unknown) => string;
  /** Что делать, когда досье перестраивается: какую кнопку нажать снова. */
  rebuiltHint: string;
}

/**
 * Отказ старта хода из досье (F05-11, F06-3): причина словами, ссылка на «LLM settings» при
 * потолке; `DOSSIER_STALE` (старта или оценки) — «Rebuild dossier» с оценкой досье. Досье,
 * которому старт откажет `DOSSIER_TOO_LONG` (T147), не перестраивается: «Rebuild» неактивна.
 */
export const StartRefusal: FC<StartRefusalProps> = ({
  versionId,
  lang,
  startError,
  estimateError,
  rebuildDossier,
  refusalText,
  rebuiltHint,
}) => {
  const [rebuilding, setRebuilding] = useState(false);
  const dossierEstimate = useDossierEstimate(versionId, rebuilding);
  // Перестройка пошла — кнопки и отказа старта нет, отказала — снова есть.
  const rebuildDone = rebuildDossier.isPending || rebuildDossier.isSuccess;
  const stale =
    !rebuildDone && [startError, estimateError].some((e) => refusalCode(e) === 'DOSSIER_STALE');
  const dossierMessage = dossierEstimate.data
    ? dossierEstimateText(dossierEstimate.data)
    : dossierEstimate.isError
      ? refusalText(dossierEstimate.error)
      : 'Estimating the cost…';

  return (
    <>
      {startError && !rebuildDone ? (
        <p className={styles.error} role="alert">
          {refusalText(startError)}
          {refusalCode(startError) === 'LLM_CEILING_REACHED' && (
            <>
              {' '}
              <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link>
            </>
          )}
        </p>
      ) : null}
      {stale && (
        <Button
          variant="secondary"
          onClick={() => setRebuilding(true)}
          loading={rebuildDossier.isPending}
          disabled={rebuildDossier.isPending}
        >
          Rebuild dossier
        </Button>
      )}
      {rebuildDossier.error ? (
        <p className={styles.error} role="alert">
          {refusalText(rebuildDossier.error)}
        </p>
      ) : null}
      {rebuildDossier.isSuccess && (
        <p className={styles.labelHint} role="status">
          {rebuiltHint}
        </p>
      )}
      <ConfirmDialog
        isOpen={rebuilding}
        title="Rebuild dossier"
        message={dossierMessage}
        confirmLabel="Rebuild"
        isLoading={dossierEstimate.isFetching}
        // Старт откажет `DOSSIER_TOO_LONG` (T147): «Rebuild» закрыл бы строку отказом, а не строил.
        isConfirmDisabled={!dossierEstimate.data || dossierEstimate.data.refusedTooLong}
        onConfirm={() => {
          setRebuilding(false);
          rebuildDossier.mutate();
        }}
        onCancel={() => setRebuilding(false)}
      />
    </>
  );
};
