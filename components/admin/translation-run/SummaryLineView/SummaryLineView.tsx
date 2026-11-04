import type { FC } from 'react';
import Link from 'next/link';
import { versionTabHref } from '@/components/admin/books/BookVersionTabs/versionTab.constants';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { TranslationRunLanguageStatus, TranslationRunSummary } from '@/types/api-schema';
import { summaryLineOf } from '../summaryLine.utils';

export interface SummaryLineViewProps {
  writeSummary: boolean;
  language: { status: TranslationRunLanguageStatus; summary: TranslationRunSummary | null };
  /** Версия языка: вкладка Summary живёт на её странице. */
  draftVersionId: string | null;
  lang: SupportedLang;
}

/** Строка раздела языка запуска со ссылкой на вкладку Summary там, где за ней нужно идти. */
export const SummaryLineView: FC<SummaryLineViewProps> = ({
  writeSummary,
  language,
  draftVersionId,
  lang,
}) => {
  const line = summaryLineOf(writeSummary, language);
  if (!line) return null;
  return (
    <span>
      {line.text}
      {line.link !== null && draftVersionId !== null && (
        <>
          {'. '}
          <Link href={versionTabHref(lang, draftVersionId, 'summary')}>{line.link}</Link>
        </>
      )}
    </span>
  );
};
