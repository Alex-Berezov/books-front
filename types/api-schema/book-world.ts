/**
 * Мир книги (F08-1) — `versions/:bookVersionId/world[/:key]`.
 * Зеркало `books/src/modules/book-world/dto/*.ts`: форма блоков героя — `tech.md` §3,
 * контракт — техбриф `F08-1` §3 (`books-app-docs/features/F08-book-wiki/`). Она же JSON импорта.
 * У ответа `null` у поля — поля нет; в теле записи `null`/`[]`/`''` — очистить поле.
 */

import type { BookAnalysisRole } from './book-analysis';
import type { ISODate } from './common';
import type { SupportedLang } from '@/lib/i18n/lang';

/** Тип сущности; в F08-1 запись принимает только `character`, прочие — пачками своего типа. */
export type WorldEntityType = 'character' | 'pair' | 'place' | 'object' | 'term' | 'event';

export type BookWorldRole = BookAnalysisRole;

export interface BookWorldProfile {
  position?: string | null;
  relationToMain?: string | null;
}

export interface BookWorldArcStage {
  title: string;
  text: string;
  chapter: number;
}

export interface BookWorldArc {
  from: string;
  to: string;
  stages?: BookWorldArcStage[] | null;
}

export interface BookWorldScene {
  chapter: number;
  title: string;
  text: string;
  paragraph?: number | null;
}

export interface BookWorldRelation {
  /** Ключ сущности мира этой версии или героя её анализа. */
  to: string;
  label: string;
}

/** Цитата дословно из главы `chapter` этой версии (решение арбитра `F08 | F08-1` R8). */
export interface BookWorldQuote {
  text: string;
  chapter: number;
  speakerKey?: string | null;
  interpretation: string;
}

export interface BookWorldAdaptation {
  title: string;
  year?: number | null;
  actor?: string | null;
  differences: string;
}

export interface BookWorldFaq {
  question: string;
  answer: string;
}

export interface BookWorldSource {
  title: string;
  url: string;
}

/** Посчитанное присутствие (F08-2): главы, где сущность найдена, и первая из них. До F08-2 — `null`. */
export interface BookWorldMentions {
  chapters: number[];
  first: number | null;
}

/** Поля героя (`tech.md` §3) — общая часть ответа и тела записи. */
export interface BookWorldCharacterFields {
  aliases: string[] | null;
  short: string | null;
  profile: BookWorldProfile | null;
  appearance: string | null;
  character: string | null;
  arc: BookWorldArc | null;
  scenes: BookWorldScene[] | null;
  relations: BookWorldRelation[] | null;
  quotes: BookWorldQuote[] | null;
  critique: string | null;
  prototypes: string | null;
  adaptations: BookWorldAdaptation[] | null;
  faq: BookWorldFaq[] | null;
  sources: BookWorldSource[] | null;
}

/** Служебные поля — только редактору (`admin`, `content_manager`); анониму поля нет. */
export interface BookWorldEditor {
  isVisible: boolean;
  readAt: ISODate | null;
  /** Последняя запись текста моделью; `null` — модель текст не писала. */
  autoTextAt: ISODate | null;
  firstPublishedAt: ISODate | null;
  /** Чего не хватает до ядра (`world-core.ts` бэкенда); пусто — ядро есть. */
  missing: string[];
}

export interface BookWorldEntitySummary {
  key: string;
  type: WorldEntityType;
  name: string;
  role: BookWorldRole | null;
  short: string | null;
  hasCore: boolean;
  isIndexable: boolean;
  updatedAt: ISODate;
  editor?: BookWorldEditor;
}

export interface BookWorldListResponse {
  language: SupportedLang;
  entities: BookWorldEntitySummary[];
}

export interface BookWorldEntity
  extends BookWorldEntitySummary, Omit<BookWorldCharacterFields, 'short'> {
  mentions: BookWorldMentions | null;
  createdAt: ISODate;
}

export interface BookWorldEntityResponse {
  language: SupportedLang;
  /** Номера глав версии по возрастанию: `chapter` полей — только из этого списка. */
  chapterNumbers: number[];
  entity: BookWorldEntity;
}

/** Сущность в теле записи. Ключа поля нет — поле не трогается (слияние на сервере). */
export type BookWorldEntityInput = {
  key: string;
  type: WorldEntityType;
  /** Обязательно у новой сущности. */
  name?: string;
  role?: BookWorldRole | null;
} & Partial<BookWorldCharacterFields>;

/** Тело `PUT versions/:id/world`: вся версия; сущности вне тела не трогаются. */
export interface SaveBookWorldRequest {
  language: SupportedLang;
  entities: BookWorldEntityInput[];
}

/** Тело `PUT versions/:id/world/:key`: ключ — в адресе. */
export type SaveBookWorldEntityRequest = { language: SupportedLang } & Omit<
  BookWorldEntityInput,
  'key'
> & { key?: string };

export interface BookWorldWarning {
  code: 'core_incomplete';
  path: string;
  message: string;
}

export interface BookWorldSaveResponse {
  /** Список после записи; `null` на `dryRun`. */
  world: BookWorldListResponse | null;
  entities: { key: string; created: boolean; hasCore: boolean; warnings: BookWorldWarning[] }[];
}

export interface BookWorldEntitySaveResponse {
  /** Сохранённая сущность; `null` на `dryRun`. */
  entity: BookWorldEntity | null;
  hasCore: boolean;
  warnings: BookWorldWarning[];
}

/**
 * Сверка импорта всей версии (решение арбитра `F08 | F08-1` R6, 15.11.2026): самый свежий
 * `updatedAt` и число сущностей, которые видела вкладка; удалённую сущность `updatedAt` не видит,
 * число — видит. Сущностей нет — `expectedAbsent`.
 */
export interface BookWorldExpected {
  expectedUpdatedAt?: string;
  expectedAbsent?: 'true';
  expectedCount?: number;
}

export interface MarkBookWorldReadRequest {
  /** `autoTextAt`, который видела вкладка: сервер отвечает 409 `WORLD_TEXT_CHANGED` при расхождении. */
  autoTextAt: ISODate | null;
}

export interface SetBookWorldFlagsRequest {
  isVisible?: boolean;
  isIndexable?: boolean;
}

/** Сущность в обзоре книги: только публичные (`isListed`). */
export interface BookOverviewWorldKey {
  key: string;
  type: WorldEntityType;
  name: string;
  isIndexable: boolean;
}
