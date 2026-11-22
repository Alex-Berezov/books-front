import type { FC } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { TranslationReportLanguage } from '@/types/api-schema';
import { analysisLineOf } from '../analysisLine.utils';
import { FindingItem } from '../FindingItem';
import { SectionLineView } from '../SectionLineView';
import { SummaryLineView } from '../SummaryLineView';
import {
  DRAFT_LINK_TEXT,
  failedText,
  FINAL_CHECK_TEXT,
  findingText,
  languageStatusText,
  rewriteRefusalText,
} from '../translationRun.utils';
import { worldLineOf } from '../worldLine.utils';
import styles from './RunReportModal.module.scss';

/**
 * Отчёт одного языка запуска (F05-7, `product.md` §2.4): черновик, строки Summary, Analysis
 * и World с тратами, куски и повторы, итоговая проверка, главы не в черновике и находки.
 */
export const LanguageReport: FC<{
  report: TranslationReportLanguage;
  lang: SupportedLang;
  writeSummary: boolean;
  writeAnalysis: boolean;
  writeWorld: boolean;
}> = ({ report: l, lang, writeSummary, writeAnalysis, writeWorld }) => {
  // Строка анализа: и без флага списка, если анализ у языка есть; строки нет (язык `done` без
  // анализа) — без пустого абзаца.
  const analysisLine = analysisLineOf(writeAnalysis || l.analysis != null, {
    status: l.status,
    analysis: l.analysis ?? null,
  });
  const worldLine = worldLineOf(writeWorld || l.world != null, {
    status: l.status,
    world: l.world ?? null,
    analysis: l.analysis ?? null,
  });
  // Находки от текста до повтора или правки (`stale`) показаны приглушёнными; отказ перезаписи — своей строкой.
  const flagged = l.chapters.filter(
    (c) => c.findings.length > 0 || c.flagReason !== null || c.rewriteRefusal !== null
  );
  return (
    <section className={styles.language} aria-label={`Report ${l.language}`}>
      <h3 className={styles.subtitle}>
        {l.language.toUpperCase()}: {languageStatusText(l.status)}
      </h3>
      {l.status === 'failed' && <p>{failedText(l)}</p>}
      <p>
        {l.draftVersionId ? (
          <Link href={`/admin/${lang}/books/versions/${l.draftVersionId}`}>{DRAFT_LINK_TEXT}</Link>
        ) : (
          'No draft version.'
        )}{' '}
        {/* Ноль глав при черновике показывается явно (решение арбитра 24.10.2026, 6b круг 5 В1). */}
        Chapters written: {l.writtenChapters}.
      </p>
      {(writeSummary || l.summary) && (
        <p>
          <SummaryLineView
            writeSummary={writeSummary || l.summary !== null}
            language={l}
            draftVersionId={l.draftVersionId}
            lang={lang}
          />
          {l.summary && ` · spent ${formatMoney(l.summary.spentUsd)}`}
        </p>
      )}
      {analysisLine && (
        <p>
          <SectionLineView
            line={analysisLine}
            tab="analysis"
            draftVersionId={l.draftVersionId}
            lang={lang}
          />
          {l.analysis && ` · spent ${formatMoney(l.analysis.spentUsd)}`}
        </p>
      )}
      {worldLine && (
        <p>
          <SectionLineView
            line={worldLine}
            tab="world"
            draftVersionId={l.draftVersionId}
            lang={lang}
          />
          {l.world && ` · spent ${formatMoney(l.world.spentUsd)}`}
        </p>
      )}
      <p>
        Pieces: {l.chunks.total}, retries: {l.chunks.retries}, flagged: {l.flaggedChunks}
        {l.chunks.flagged.length > 0 &&
          ` (${l.chunks.flagged.map((f) => `${findingText(f.reason)}: ${f.count}`).join(', ')})`}
        . Flagged chapters: {l.flaggedChapters}.
      </p>
      <p>
        Final check: {FINAL_CHECK_TEXT[l.finalCheck.status]}
        {l.finalCheck.status === 'done' && `, chapters checked ${l.finalCheck.chaptersChecked}`}
        {l.finalCheck.missingChapters.length > 0 &&
          `, missing chapters ${l.finalCheck.missingChapters.join(', ')}`}
        .
      </p>
      {/* Автор вне глоссария (`product.md` §2.4, решение `F05 | F05-6`): только при черновике; null -
          этап полей версии не дошёл или автора нет ни у исходника, ни в ответе (решение `F05 | F05-17`). */}
      {l.draftVersionId && l.authorFromGlossary === false && (
        <p>
          Author name in the draft: not from the glossary — translated or transliterated by the
          model, check it.
        </p>
      )}
      {l.notWrittenChapters.length > 0 && (
        <p>Chapters not in the draft: {l.notWrittenChapters.join(', ')}.</p>
      )}
      {l.takenChapters.length > 0 && (
        <p>Chapter numbers taken by other chapters in the draft: {l.takenChapters.join(', ')}.</p>
      )}
      {flagged.length > 0 && (
        <ul className={styles.findings}>
          {flagged.map((c) => (
            <li key={c.number}>
              Chapter {c.number}
              {c.flagReason ? `: ${findingText(c.flagReason)}` : ''}
              {c.rewriteRefusal && (
                <p className={styles.muted}>
                  Not rewritten after a retry or edit: {rewriteRefusalText(c.rewriteRefusal)}.
                </p>
              )}
              {c.findings.length > 0 && (
                <ul>
                  {c.findings.map((f, i) => (
                    <FindingItem key={i} finding={f} />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
