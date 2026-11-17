'use client';

import type { FC } from 'react';
import dynamic from 'next/dynamic';
import type { SupportedLang } from '@/lib/i18n/lang';
import draftStyles from '@/components/admin/books/ContentDraft/ContentDraft.module.scss';

// Ход «Write World» (F08-4b) — только у `admin`: в бандл страницы версии не входит.
const WorldWrite = dynamic(() => import('./WorldWrite').then((m) => m.WorldWrite), {
  ssr: false,
});

/** Языки версии, которые ход принимает (`WORLD_WRITE_LANGUAGES` бэкенда): остальным он отказывает 409. */
const WORLD_WRITE_LANGUAGES: readonly string[] = ['ru', 'en'];

export interface WorldWriteSectionProps {
  versionId: string;
  /** Язык версии: ход есть только у `ru` и `en` (решение арбитра `F08 | F08-4`, Q5). */
  language: string;
  /** Язык интерфейса админки: ссылки панели на «LLM settings». */
  lang: SupportedLang;
}

/**
 * Место хода «Write World» во вкладке World (F08 `product.md` §17 п.6-7): панель у версии `ru`/`en`,
 * у остальных — подсказка без запросов. Показывает вкладка только `admin`.
 */
export const WorldWriteSection: FC<WorldWriteSectionProps> = ({ versionId, language, lang }) =>
  WORLD_WRITE_LANGUAGES.includes(language) ? (
    <WorldWrite versionId={versionId} lang={lang} />
  ) : (
    <p className={draftStyles.hint}>Write World is available for ru and en versions only.</p>
  );
