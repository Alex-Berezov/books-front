'use client';

import { useEffect, useState, type FC } from 'react';
import { Alert, Checkbox, Select, Spin, Tabs } from 'antd';
import Link from 'next/link';
import {
  useBookVersion,
  useTranslationChunks,
  useTranslationRun,
  useTranslationRunReport,
} from '@/api/hooks';
import { FindingItem } from '@/components/admin/translation-run/FindingItem';
import {
  findingText,
  refusalText,
  rewriteRefusalText,
} from '@/components/admin/translation-run/translationRun.utils';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  TranslationChunksChapter,
  TranslationRun,
  TranslationRunLanguage,
} from '@/types/api-schema';
import {
  chapterOptionLabel,
  chapterOptionsOf,
  chapterRetrying,
  chunkRefusalText,
  visibleChunks,
} from '../translationChunks.utils';
import { ChunkCard } from './ChunkCard';
import { RunContextView } from './RunContextView';
import styles from './TranslationChunks.module.scss';

export interface TranslationChunksProps {
  lang: SupportedLang;
  /** Версия-исходник запуска: страница живёт под её адресом. */
  versionId: string;
  runId: string;
  bookId: string;
  /** Язык из адреса; нет его или он не из запуска — первый язык запуска. */
  language: string | null;
}

/**
 * Запуск идёт — повтор и правка любого его куска, на любом языке, — 409 `RUN_ACTIVE`
 * (`assertRunStopped` бэкенда смотрит на операцию запуска, а не на язык).
 */
const runRunning = (run: TranslationRun): boolean => run.operation.status === 'active';

/**
 * Куски запуска «оригинал | перевод» по главам (F05-7v, `product.md` §2.4, §7 п.12): выбор
 * языка и главы, фильтр «только флаги», повтор и правка куска, досье и глоссарий запуска только
 * на чтение.
 */
export const TranslationChunks: FC<TranslationChunksProps> = ({
  lang,
  versionId,
  runId,
  bookId,
  language: initialLanguage,
}) => {
  const run = useTranslationRun(runId, bookId);
  // Пока запуск идёт, главы собираются и флаги меняются: список глав берётся из живого отчёта.
  const report = useTranslationRunReport(runId, run.data ? runRunning(run.data) : false);
  const [picked, setPicked] = useState<string | null>(initialLanguage);
  const languages = run.data?.languages ?? [];
  const progress = languages.find((l) => l.language === picked) ?? languages[0];

  // Отказ перечитывания хода не стирает экран с открытой формой: только первое чтение.
  if (run.isError && !run.data) return <Alert type="error" message={refusalText(run.error)} />;
  if (!run.data || !progress) return <Spin />;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Original | translation</h1>
        <Link href={`/admin/${lang}/books/versions/${versionId}`}>Back to the version</Link>
      </div>
      {run.isError && (
        <Alert className={styles.alert} type="error" message={refusalText(run.error)} />
      )}
      <Select
        aria-label="Language"
        className={styles.select}
        value={progress.language}
        options={languages.map((l) => ({ value: l.language, label: l.language.toUpperCase() }))}
        onChange={(v: string) => setPicked(v)}
      />
      <Tabs
        items={[
          {
            key: 'pieces',
            label: 'Pieces',
            children: (
              <LanguagePieces
                // Своё состояние у каждого языка: глава и фильтр не переезжают на другой.
                key={progress.language}
                runId={runId}
                lang={lang}
                progress={progress}
                runActive={runRunning(run.data)}
                report={report}
              />
            ),
          },
          {
            key: 'context',
            label: 'Dossier and glossary',
            children: (
              <RunContextView
                sourceVersionId={versionId}
                draftVersionId={progress.draftVersionId}
                dossierId={run.data.dossierId}
                glossaryId={progress.glossaryId}
                language={progress.language}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

const LanguagePieces: FC<{
  runId: string;
  lang: SupportedLang;
  progress: TranslationRunLanguage;
  runActive: boolean;
  report: ReturnType<typeof useTranslationRunReport>;
}> = ({ runId, lang, progress, runActive, report }) => {
  const reportLanguage = report.data?.languages.find((l) => l.language === progress.language);
  const options = chapterOptionsOf(reportLanguage?.chapters ?? [], progress);
  const [picked, setPicked] = useState<number | null>(null);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  // Куски, с которыми работали: под фильтром не пропадают вместе с итогом правки или повтора.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  // Глава по умолчанию — после отчёта: до него в списке только глава хода, а приход отчёта
  // или его перечитывание не должны уводить экран с открытой главы.
  const settled = report.data !== undefined || report.isError;
  const fallback = (options.find((o) => o.flagged) ?? options[0])?.number ?? null;
  useEffect(() => {
    if (picked === null && settled && fallback !== null) setPicked(fallback);
  }, [picked, settled, fallback]);
  const chapter = picked;
  const draftId = progress.draftVersionId;
  const chunks = useTranslationChunks(runId, progress.language, chapter, runActive, draftId);
  // Статус черновика — на момент открытия экрана: опубликовать могли в соседней вкладке.
  const draft = useBookVersion(draftId ?? '', { enabled: draftId !== null, staleTime: 0 });
  // Не прочитали (удалён, отказ) — тоже предупреждаем: повтор платный, перезапись не обещана.
  const notDraft =
    draftId !== null &&
    (draft.isError || (draft.data !== undefined && draft.data.status !== 'draft'));

  return (
    <>
      {report.isError && <Alert type="error" message={refusalText(report.error)} />}
      <div className={styles.toolbar}>
        <Select
          aria-label="Chapter"
          className={styles.select}
          placeholder="No chapters yet"
          value={chapter}
          options={options.map((o) => ({ value: o.number, label: chapterOptionLabel(o) }))}
          onChange={(v: number) => setPicked(v)}
        />
        <Checkbox checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)}>
          Only flagged pieces
        </Checkbox>
      </div>
      {(chunks.isLoading || !settled) && <Spin />}
      {chunks.isError && <Alert type="error" message={chunkRefusalText(chunks.error)} />}
      {chunks.data && (
        <>
          {chunks.data.sourceChanged && (
            <Alert
              className={styles.alert}
              type="warning"
              message="The source chapter changed after the split: blocks may not match the source."
            />
          )}
          <ChapterSummary chapter={chunks.data.chapter} />
          {visibleChunks(chunks.data.chunks, onlyFlagged, touched).map((c) => (
            <ChunkCard
              key={c.id}
              chunk={c}
              runId={runId}
              lang={lang}
              draftVersionId={draftId}
              chapterId={chunks.data?.chapter?.chapterId ?? null}
              notDraft={notDraft}
              runActive={runActive}
              // Видно только по открытой главе; повтор в другой главе — отказ 409 своей подписью.
              pairBusy={chapterRetrying(chunks.data?.chunks ?? [])}
              onTouch={() => setTouched((t) => new Set(t).add(c.id))}
            />
          ))}
          {chunks.data.chunks.length === 0 && (
            <p className={styles.muted}>The chapter has no pieces yet.</p>
          )}
          {onlyFlagged &&
            chunks.data.chunks.length > 0 &&
            !chunks.data.chunks.some((c) => c.status === 'flagged') && (
              <p className={styles.muted}>No flagged pieces in this chapter.</p>
            )}
        </>
      )}
    </>
  );
};

const CHAPTER_STATUSES: Record<TranslationChunksChapter['status'], string> = {
  pending: 'waiting',
  assembled: 'assembled',
  flagged: 'flagged',
  written: 'written into the draft',
};

/** Глава: статус, флаг, итог перезаписи и находки; находки до правки или повтора приглушены. */
const ChapterSummary: FC<{ chapter: TranslationChunksChapter | null }> = ({ chapter }) => {
  if (chapter === null) {
    return <p className={styles.muted}>The chapter is not assembled yet.</p>;
  }
  return (
    <section className={styles.chapter} aria-label="Chapter">
      <p>
        Chapter: {CHAPTER_STATUSES[chapter.status]}
        {chapter.flagReason && `, flag: ${findingText(chapter.flagReason)}`}.
      </p>
      {chapter.rewriteRefusal && (
        <Alert
          className={styles.alert}
          type="warning"
          message={`The last retry or edit did not rewrite the chapter: ${rewriteRefusalText(chapter.rewriteRefusal)}.`}
        />
      )}
      {chapter.findings.length > 0 && (
        <ul className={styles.list}>
          {chapter.findings.map((f, i) => (
            <FindingItem key={i} finding={f} />
          ))}
        </ul>
      )}
    </section>
  );
};
