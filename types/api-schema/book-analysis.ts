/**
 * Анализ книги (F03-1) — `GET`/`PUT versions/:bookVersionId/analysis`.
 * Зеркало `books/src/modules/book-analysis/dto/*.ts`: форма блоков — `tech.md` §3
 * (`books-app-docs/features/F03-book-analysis/`), она же JSON импорта и промпта.
 * У ответа `null` у блока — блока нет; в теле записи `null`/`[]`/`''` — очистить блок.
 */

import type { ISODate } from './common';
import type { SupportedLang } from '@/lib/i18n/lang';

export type BookAnalysisRole = 'main' | 'secondary' | 'minor';
export type BookAnalysisTimelineKind = 'author' | 'epoch' | 'book';
export type BookAnalysisAdaptationKind = 'film' | 'series' | 'stage' | 'other';

export interface BookAnalysisFacts {
  genre?: string | null;
  movement?: string | null;
  writtenYears?: string | null;
  settingPlace?: string | null;
  settingTime?: string | null;
  narrator?: string | null;
  structure?: string | null;
}

/** Цитата из книги; `chapter` — номер главы этой версии. */
export interface BookAnalysisQuote {
  text: string;
  chapter?: number | null;
}

export interface BookAnalysisThemeQuote extends BookAnalysisQuote {
  comment?: string | null;
}

export interface BookAnalysisTheme {
  key: string;
  title: string;
  interpretation?: string | null;
  chapters?: number[] | null;
  quotes?: BookAnalysisThemeQuote[] | null;
}

export interface BookAnalysisRelation {
  to: string;
  label: string;
}

export interface BookAnalysisCharacter {
  key: string;
  name: string;
  role: BookAnalysisRole;
  description?: string | null;
  arc?: { from: string; to: string } | null;
  quote?: BookAnalysisQuote | null;
  themeKeys?: string[] | null;
  relations?: BookAnalysisRelation[] | null;
}

export interface BookAnalysisSymbol {
  title: string;
  interpretation: string;
  chapters?: number[] | null;
  quote?: BookAnalysisQuote | null;
}

export interface BookAnalysisKeyQuote {
  text: string;
  chapter?: number | null;
  speakerKey?: string | null;
  themeKeys?: string[] | null;
  interpretation?: string | null;
}

export interface BookAnalysisTimelineEvent {
  year: string;
  event: string;
  kind: BookAnalysisTimelineKind;
}

export interface BookAnalysisStyle {
  device: string;
  explanation: string;
  example?: BookAnalysisQuote | null;
}

export interface BookAnalysisAdaptation {
  title: string;
  year?: number | null;
  kind: BookAnalysisAdaptationKind;
  differences?: string | null;
}

export interface BookAnalysisMisreading {
  myth: string;
  explanation: string;
}

export interface BookAnalysisFaq {
  question: string;
  answer: string;
}

export interface BookAnalysisSource {
  title: string;
  url: string;
}

/** Блоки §3 без `language` — общая часть ответа и тела записи. */
export interface BookAnalysisBlocks {
  facts: BookAnalysisFacts | null;
  mainIdea: string | null;
  themes: BookAnalysisTheme[] | null;
  characters: BookAnalysisCharacter[] | null;
  symbols: BookAnalysisSymbol[] | null;
  keyQuotes: BookAnalysisKeyQuote[] | null;
  titleMeaning: string | null;
  endingMeaning: string | null;
  context: string | null;
  timeline: BookAnalysisTimelineEvent[] | null;
  style: BookAnalysisStyle[] | null;
  reception: string | null;
  adaptations: BookAnalysisAdaptation[] | null;
  misreadings: BookAnalysisMisreading[] | null;
  discussionQuestions: string[] | null;
  faq: BookAnalysisFaq[] | null;
  sources: BookAnalysisSource[] | null;
}

export interface BookAnalysisDetail extends BookAnalysisBlocks {
  /** Язык версии. */
  language: SupportedLang;
  /** Ядро заполнено (считает бэкенд): по нему страница, кнопка и карта сайта. */
  hasCore: boolean;
  /**
   * Номера глав версии по возрастанию (F03-2): ссылка «глава N» ставится только на номер
   * из этого списка; у версии без текста список пуст и ссылок нет (`product.md` §1.6).
   */
  chapterNumbers: number[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Тело `PUT`: JSON импорта. Ключа нет — блок не трогается; админка шлёт всю запись (А4). */
export type SaveBookAnalysisRequest = { language: SupportedLang } & Partial<BookAnalysisBlocks>;

export type BookAnalysisWarningCode = 'chapter_not_found' | 'core_incomplete';

export interface BookAnalysisWarning {
  code: BookAnalysisWarningCode;
  /** Путь поля: `themes.0.chapters.1` или часть ядра (`keyQuotes`). */
  path: string;
  message: string;
}

export interface BookAnalysisSaveResponse {
  /** Сохранённая запись; `null` на `dryRun`. */
  analysis: BookAnalysisDetail | null;
  hasCore: boolean;
  warnings: BookAnalysisWarning[];
}

/** Глава без текста — «Вводные для промпта» (`GET /admin/versions/:id/chapter-titles`). */
export interface ChapterTitle {
  number: number;
  title: string;
}

/**
 * Где анализ закрыт блоком окончённой претензии — `GET analyses/claim-closures` (F03-2, решение
 * арбитра `F03 | F03-2`). Читает только middleware: закрывает `/analysis` в стране блока.
 */
export interface BookAnalysisClaimClosure {
  /** Слаги, по которым открывается страница: слаг книги и слаги версий. */
  slugs: string[];
  /** Язык закрытой версии; `null` — все языки книги. */
  language: SupportedLang | null;
  /** Страна (ISO, верхний регистр); `null` — весь мир. */
  countryCode: string | null;
  expiresAt: ISODate | null;
}

export interface BookAnalysisClaimClosures {
  items: BookAnalysisClaimClosure[];
}
