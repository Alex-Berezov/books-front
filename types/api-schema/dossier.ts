/**
 * Досье книги и глоссарий языка в админке (фича F05, F05-2) — только `admin`. Оценка и
 * перестройка досье — с вкладки Summary при `DOSSIER_STALE` (F05-10, решение арбитра
 * `F05 | F05-7v`).
 */

import type { SupportedLang } from './common';
import type { LlmMoney, LlmOperation } from './llm';

export type BookDossierStatus = 'building' | 'ready' | 'failed';

export interface DossierCharacter {
  key: string;
  name: string;
  variants: string[];
  gender: string;
  whoIs: string;
  address: Array<{ to: string; form: string }>;
  relations: Array<{ to: string; label: string }>;
  firstChapter: number;
  fate: string;
  role: 'main' | 'secondary' | 'episodic';
}

export interface DossierEntity {
  key: string;
  name: string;
  kind: 'place' | 'object' | 'organization' | 'term';
  whatIs: string;
  firstChapter: number;
}

export interface DossierData {
  characters: DossierCharacter[];
  entities: DossierEntity[];
  narration: { person: string; form: string; notes: string };
  setting: { place: string; time: string };
  structure: { parts: Array<{ title: string; chapters: number[] }>; notes: string };
  chronology: Array<{ event: string; chapter: number; orderNote: string }>;
  chapters: Array<{ number: number; title: string; summary: string }>;
  summaryPlan: Array<{ number: number; title: string; chapters: number[]; why: string }>;
  voice: {
    pace: string;
    sentenceLength: string;
    lexicon: string;
    irony: string;
    devices: Array<{ name: string; howShown: string; example: string; chapter: number }>;
  };
  motifs: Array<{ image: string; chapters: number[] }>;
}

/** Ответ `GET /admin/versions/:id/dossier`; `missing` — досье у версии нет. */
export interface DossierStatus {
  status: BookDossierStatus | 'missing';
  id: string | null;
  sourceVersionId: string;
  generation: number | null;
  fresh: boolean | null;
  formatVersion: number | null;
  model: string | null;
  partsDone: number;
  /** Ответы групп сводки, все уровни (F05-12); 0 — сводка без групп. */
  groupsDone: number;
  /** Заведённые группы, все уровни: уровень заводится после нижнего, итог растёт по ходу. */
  groupsTotal: number;
  /** `DOSSIER_TOO_LONG`, `DOSSIER_SOURCE_CHANGED`; `null` у `failed` — общий отказ. */
  failedReason: string | null;
  operation: LlmOperation | null;
  previousOperation: LlmOperation | null;
  data: DossierData | null;
  updatedAt: string | null;
}

export interface GlossaryEntry {
  key: string;
  source: string;
  target: string;
  kind: string;
  keepOriginal: boolean;
  note: string;
}

export interface GlossaryData {
  entries: GlossaryEntry[];
  address: Array<{ from: string; to: string; form: string }>;
  phrases: Array<{ source: string; target: string }>;
}

/** Ответ `GET /admin/dossiers/:id/glossaries/:lang`. */
export interface Glossary {
  id: string;
  dossierId: string;
  language: SupportedLang;
  status: BookDossierStatus;
  data: GlossaryData | null;
  /** Пополнения по ходу перевода: кусок и добавленные записи. */
  history: Array<{ chunkId: string | null; entries: GlossaryEntry[] }>;
  model: string | null;
  operation: LlmOperation | null;
  previousOperation: LlmOperation | null;
  updatedAt: string;
}

/** Ответ `GET /admin/versions/:id/dossier/estimate`: оценка построения сверху. */
export interface DossierEstimate {
  /** Версия, по которой строится досье (Р5). */
  sourceVersionId: string;
  /** Глав с текстом. */
  chapters: number;
  /** Кусков глав первого прохода. */
  parts: number;
  estimateUsd: LlmMoney;
  /** Лимит операции по умолчанию: оценка × 1,5. */
  suggestedLimitUsd: LlmMoney;
}
