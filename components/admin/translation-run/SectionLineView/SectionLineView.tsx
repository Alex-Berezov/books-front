import type { FC } from 'react';
import Link from 'next/link';
import { versionTabHref } from '@/components/admin/books/BookVersionTabs/versionTab.constants';
import type { SectionLine } from '../sectionLine.utils';
import type { TabType } from '@/components/admin/books/BookVersionTabs/BookVersionTabs.types';
import type { SupportedLang } from '@/lib/i18n/lang';

export interface SectionLineViewProps {
  /** `null` — строки нет. */
  line: SectionLine | null;
  /** Вкладка раздела на странице версии языка. */
  tab: Extract<TabType, 'summary' | 'analysis'>;
  /** Версия языка: вкладка раздела живёт на её странице. */
  draftVersionId: string | null;
  lang: SupportedLang;
}

/**
 * Строка раздела языка запуска (Summary F06-5b, Analysis F07-3b) со ссылкой на вкладку раздела
 * там, где за ней нужно идти; версии нет (черновик удалён) — без ссылки.
 */
export const SectionLineView: FC<SectionLineViewProps> = ({ line, tab, draftVersionId, lang }) => {
  if (!line) return null;
  return (
    <span>
      {line.text}
      {line.link !== null && draftVersionId !== null && (
        <>
          {'. '}
          <Link href={versionTabHref(lang, draftVersionId, tab)}>{line.link}</Link>
        </>
      )}
    </span>
  );
};
