'use client';

import type { FC } from 'react';
import { Alert, Spin } from 'antd';
import { useDossierGlossary, useVersionDossier } from '@/api/hooks';
import { refusalText } from '@/components/admin/translation-run/translationRun.utils';
import type { DossierStatus, Glossary } from '@/types/api-schema';
import { dossierFailedText, dossierProgressText } from '../translationChunks.utils';
import { DossierData } from './DossierData';
import styles from './TranslationChunks.module.scss';

export interface RunContextViewProps {
  /** Версия-исходник запуска. */
  sourceVersionId: string;
  /** Черновик языка: его ручка досье отдаёт досье запуска, а не действующее поколение. */
  draftVersionId: string | null;
  /** Досье запуска; `null` — ещё не построено (решение арбитра `F05 | F05-7v-b`). */
  dossierId: string | null;
  /** Глоссарий языка из хода запуска; `null` — ещё не построен. */
  glossaryId: string | null;
  language: string;
}

/**
 * Досье и глоссарий, с которыми переводил запуск, — только чтение (`product.md` §6): ни правки,
 * ни построения (F05-10). Досье берётся через черновик языка — это досье запуска; без черновика —
 * через исходник, и чужое поколение не подставляется.
 */
export const RunContextView: FC<RunContextViewProps> = ({
  sourceVersionId,
  draftVersionId,
  dossierId,
  glossaryId,
  language,
}) => {
  // Досье запуска привязывается, когда оно готово; пока его строят, ход виден по исходнику (F05-12).
  const dossier = useVersionDossier(draftVersionId ?? sourceVersionId, true);
  const glossary = useDossierGlossary(dossierId, language, glossaryId !== null);

  if (dossierId === null) {
    return (
      <p className={styles.muted}>
        The dossier of this run is not built yet.
        {dossier.data?.status === 'building' && ` ${dossierProgressText(dossier.data)}`}
      </p>
    );
  }
  return (
    <div className={styles.context}>
      <section aria-label="Dossier">
        <h2 className={styles.sectionTitle}>Dossier</h2>
        {dossier.isLoading && <Spin />}
        {dossier.isError && <Alert type="error" message={refusalText(dossier.error)} />}
        {dossier.data && <DossierBody dossier={dossier.data} runDossierId={dossierId} />}
      </section>
      <section aria-label="Glossary">
        <h2 className={styles.sectionTitle}>Glossary {language.toUpperCase()}</h2>
        {glossaryId === null && (
          <p className={styles.muted}>The glossary of this language is not built yet.</p>
        )}
        {glossary.isLoading && <Spin />}
        {glossary.isError && <Alert type="error" message={refusalText(glossary.error)} />}
        {glossary.data && <GlossaryBody glossary={glossary.data} />}
      </section>
    </div>
  );
};

const DossierBody: FC<{ dossier: DossierStatus; runDossierId: string }> = ({
  dossier,
  runDossierId,
}) => {
  if (dossier.status === 'missing') {
    return <p className={styles.muted}>The dossier of this run is gone.</p>;
  }
  if (dossier.id !== runDossierId) {
    return (
      <p className={styles.muted}>
        The book dossier was rebuilt after this run. The dossier of the run is shown through the
        draft version of this language, and the language has none.
      </p>
    );
  }
  if (dossier.status === 'failed') {
    return <p>The dossier was not built: {dossierFailedText(dossier.failedReason)}.</p>;
  }
  if (dossier.status === 'building' || dossier.data === null) {
    return <p className={styles.muted}>{dossierProgressText(dossier)}</p>;
  }
  return (
    <>
      <p className={styles.muted}>
        Generation {dossier.generation ?? '—'}, model {dossier.model ?? '—'}
        {dossier.fresh === false && ' · the source changed since it was built'}.
      </p>
      <DossierData data={dossier.data} />
    </>
  );
};

const GlossaryBody: FC<{ glossary: Glossary }> = ({ glossary }) => {
  if (glossary.status === 'failed') return <p>The glossary was not built.</p>;
  if (glossary.data === null) return <p className={styles.muted}>The glossary is being built.</p>;
  const g = glossary.data;
  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Source</th>
            <th>Translation</th>
            <th>Kind</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {g.entries.map((e) => (
            <tr key={e.key}>
              <td>{e.source}</td>
              <td>{e.keepOriginal ? `${e.target} (kept as in the original)` : e.target}</td>
              <td>{e.kind}</td>
              <td>{e.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {g.address.length > 0 && (
        <>
          <h3 className={styles.subtitle}>Forms of address</h3>
          <ul className={styles.list}>
            {g.address.map((a, i) => (
              <li key={i}>
                {a.from} → {a.to}: {a.form}
              </li>
            ))}
          </ul>
        </>
      )}
      {g.phrases.length > 0 && (
        <>
          <h3 className={styles.subtitle}>Phrases</h3>
          <ul className={styles.list}>
            {g.phrases.map((p, i) => (
              <li key={i}>
                {p.source} → {p.target}
              </li>
            ))}
          </ul>
        </>
      )}
      {glossary.history.length > 0 && (
        <p className={styles.muted}>
          Added while translating: {glossary.history.reduce((n, h) => n + h.entries.length, 0)}{' '}
          entries.
        </p>
      )}
    </>
  );
};
