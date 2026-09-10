/**
 * Types for Bookshelf and Reading Progress endpoints
 *
 * User library, reading progress
 */

import type { ISODate, UUID } from './common';

/**
 * Тело ответа `POST /me/bookshelf/:versionId` (`BookshelfEntryDto` на бэкенде).
 *
 * Это **не** элемент списка полки: `bookVersion` здесь нет вовсе, сервер отдаёт саму строку
 * связи (`books/src/modules/bookshelf/bookshelf.service.ts:53-70`). До 10.09.2026 добавление
 * было типизовано формой элемента списка, то есть обещало версию книги, которой в ответе
 * никогда не было.
 */
export interface BookshelfEntry {
  id: UUID;
  userId: UUID;
  bookVersionId: UUID;
  addedAt: ISODate;
}

/**
 * Request to add book to bookshelf
 */
export interface AddToBookshelfRequest {
  versionId: UUID;
}

/**
 * Reading progress — тело ответа `GET`/`PUT /me/progress/:versionId`.
 *
 * 🔴 Форма снята с `books/prisma/schema.prisma` (модель `ReadingProgress`) и
 * `books/src/modules/reading-progress/reading-progress.service.ts`. До 22.08.2026
 * здесь числились `versionId`, `chapterId`, `percentage`, `lastReadAt` и
 * `createdAt` — ни одного из этих полей сервер не отдаёт. Схема здесь
 * пишется руками, из бэкенда не генерится, и `tsc` проверяет её
 * согласованность с самой собой, а не с ответом: выдуманное поле живёт
 * до тех пор, пока кто-нибудь не построит на нём решение.
 */
export interface ReadingProgress {
  id: UUID;
  userId: UUID;
  /** Именно `bookVersionId`, не `versionId`: так называется колонка в схеме. */
  bookVersionId: UUID;
  chapterNumber: number | null;
  audioChapterNumber: number | null;
  /** Секунды для аудио, доля 0..1 для текста — диапазон проверяет сервер. */
  position: number;
  updatedAt: ISODate;
}

/**
 * Request to update reading progress.
 *
 * 🔴 `chapterNumber` и `audioChapterNumber` — взаимоисключающие. На сервере
 * `UpdateReadingProgressDto` помечен `@Xor('chapterNumber', 'audioChapterNumber')`:
 * два заполненных поля в одном теле — это 400, а не «запишет оба».
 * Сохранить и главу чтения, и аудиоглаву можно только двумя запросами.
 *
 * 🔴 `position` зависит от того, какое поле прислано: с `chapterNumber`
 * сервер требует долю 0..1, с `audioChapterNumber` — секунды в пределах
 * длительности дорожки. Перепутать единицы — тоже 400.
 */
export interface UpdateProgressRequest {
  chapterNumber?: number;
  audioChapterNumber?: number;
  position: number;
}

/**
 * Request body for `PUT /me/progress/:versionId` — audio variant.
 *
 * 🔴 `position` обязателен. В `UpdateReadingProgressDto` у него стоят `@IsNumber()`
 * и `@Min(0)` без `@IsOptional`, а глобальный `ValidationPipe` идёт с `whitelist` и
 * `forbidNonWhitelisted` — тело без `position` это 400, а не частичное
 * обновление. Прежнее обещание «backend patches whichever fields are sent»
 * приглашало написать такой вызов, и `tsc` его пропускал.
 */
export interface UpdateAudioProgressRequest {
  /** Chapter `number` (1..n) of the currently playing audio chapter. */
  audioChapterNumber?: number;
  /** Playback position in seconds (float >= 0), в пределах длительности дорожки. */
  position: number;
}

/**
 * Полка: элемент списка и его версия книги.
 *
 * Переехали из `api/endpoints/bookshelf.ts` 10.09.2026: форму ответа слой 2 гейта
 * `check:type-sync` достаёт только через барель, и объявленная в модуле вызовов
 * под утверждения не попадает вовсе.
 */
export interface BookVersionPreview {
  id: UUID;
  bookId: UUID;
  language: string;
  slug?: string;
  title: string;
  author: string;
  description: string;
  coverImageUrl: string;
  type: string;
  isFree: boolean;
  chaptersCount?: number;
  createdAt: ISODate;
  updatedAt: ISODate;
  book?: {
    id: UUID;
    slug: string;
  };
}

export interface BookshelfItemDto {
  id: UUID;
  addedAt: ISODate;
  bookVersion: BookVersionPreview;
}

export interface BookshelfListResponse {
  items: BookshelfItemDto[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}
