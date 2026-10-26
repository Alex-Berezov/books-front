'use client';

import type { FC } from 'react';
import { ContentDraftBlock } from '@/components/admin/books/ContentDraft';
import { Button } from '@/components/admin/common/Button';
import { BOOK_ANALYSIS_LIMITS } from '@/lib/admin/book-analysis-blocks';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ContentDraft, ContentDraftDroppedQuote } from '@/types/api-schema';
import styles from './AnalysisTab.module.scss';

export interface AnalysisDraftProps {
  versionId: string;
  lang: SupportedLang;
  /** Язык версии: мотивы досье на другом языке помечаются. */
  versionLanguage: string;
  /** Правки формы в блоках заготовки не сохранены (решение арбитра `F05 | F05-11`, Р4). */
  unsaved: boolean;
  /** `updatedAt` сохранённого анализа на экране; `null` — анализа нет. */
  savedUpdatedAt: string | null;
  /** `updatedAt` записи на сервере сейчас: другое значение - анализ сохранил кто-то другой. */
  serverUpdatedAt: string | null;
  /** Открыть окно импорта с JSON заготовки. */
  onOpen: (json: string) => void;
}

const DROP_REASON: Record<ContentDraftDroppedQuote['reason'], string> = {
  NOT_FOUND: 'not word for word in the chapter',
  NO_CHAPTER: 'no chapter given',
  CHAPTER_MISSING: 'the version has no such chapter',
  OVER_LIMIT: `verified, but over the limit of ${BOOK_ANALYSIS_LIMITS.keyQuotes} key quotes with the saved ones`,
};

/**
 * Где была цитата (`path` ответа): ключевая, реплика героя или пример приёма - по имени героя
 * и названию приёма из JSON заготовки; не нашлось - ключ и номер.
 */
const quotePlace = (path: string, analysis: ContentDraft['analysis']): string => {
  const line = /^characters\.(.+)\.quote$/.exec(path);
  if (line) {
    const hero = analysis?.characters?.find((c) => c.key === line[1]);
    return `line of ${hero?.name ?? line[1]}`;
  }
  const example = /^style\.(\d+)\.example$/.exec(path);
  if (example) {
    const device = analysis?.style?.[Number(example[1])]?.device;
    return device ? `example of «${device}»` : `example of style device ${Number(example[1]) + 1}`;
  }
  return 'key quote';
};

/** Почему заготовку нельзя открыть в импорте; `null` — можно. */
const openBlockedHint = (
  draft: ContentDraft,
  unsaved: boolean,
  savedUpdatedAt: string | null,
  serverUpdatedAt: string | null
): string | null => {
  if (!draft.analysis) return 'The draft has no analysis JSON: build the draft again.';
  // Форма заполнена из записи, которой на сервере уже нет: анализ сохранил кто-то другой.
  // Импорт в такую форму и следующее сохранение затёрли бы его правки, а пересборка не поможет.
  // Заготовка новее формы - тоже чужое сохранение, даже если кэш запроса его ещё не видел
  // (даты ISO одного формата сравниваются строкой).
  const draftNewer =
    draft.analysisUpdatedAt !== null &&
    (savedUpdatedAt === null || draft.analysisUpdatedAt > savedUpdatedAt);
  if (serverUpdatedAt !== savedUpdatedAt || draftNewer) {
    return 'The analysis was saved by someone else after this tab was opened: reload the page to load it into the form.';
  }
  if (draft.analysisUpdatedAt !== savedUpdatedAt) {
    return 'The analysis was saved after this draft was built (the draft may be already imported): build a new draft only if you need one.';
  }
  if (unsaved) {
    return 'Save or undo the edits of facts, characters, keyQuotes and style first: the import replaces these blocks.';
  }
  return null;
};

/**
 * Заготовка Analysis из досье (F05-11, `product.md` §5.3), только `admin`: оболочка заготовки,
 * готовый JSON - «Open in import» (существующее окно импорта F03 с предзаполненным текстом),
 * выкинутые цитаты с причиной (Р9) и мотивы досье для «Вводных» (Р10). В анализ не пишет.
 */
export const AnalysisDraft: FC<AnalysisDraftProps> = ({
  versionId,
  lang,
  versionLanguage,
  unsaved,
  savedUpdatedAt,
  serverUpdatedAt,
  onOpen,
}) => (
  <ContentDraftBlock versionId={versionId} kind="analysis" lang={lang} blockedHint={null}>
    {(draft) => {
      const hint = openBlockedHint(draft, unsaved, savedUpdatedAt, serverUpdatedAt);
      const dropped = draft.droppedQuotes ?? [];
      const motifs = draft.motifs ?? [];
      return (
        <div className={styles.section}>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              disabled={hint !== null}
              onClick={() => onOpen(JSON.stringify(draft.analysis, null, 2))}
            >
              Open in import
            </Button>
          </div>
          {hint && <p className={styles.hint}>{hint}</p>}
          {dropped.length > 0 && (
            <div className={styles.status} role="status">
              <p>Quotes thrown away by the word-for-word check:</p>
              <ul className={styles.issueList}>
                {dropped.map((q, idx) => (
                  <li key={idx}>
                    {quotePlace(q.path, draft.analysis)}: «{q.text}»
                    {q.chapter !== null ? ` (chapter ${q.chapter})` : ''} —{' '}
                    {DROP_REASON[q.reason] ?? q.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className={styles.hint}>
            {motifs.length > 0
              ? `${motifs.length} recurring ${motifs.length === 1 ? 'motif' : 'motifs'} of the dossier ${motifs.length === 1 ? 'is' : 'are'} added to «Copy prompt inputs»`
              : 'The dossier has no recurring motifs'}
            {motifs.length > 0 && draft.dossierLanguage && draft.dossierLanguage !== versionLanguage
              ? ` (in the dossier language: ${draft.dossierLanguage}).`
              : '.'}
          </p>
        </div>
      );
    }}
  </ContentDraftBlock>
);
