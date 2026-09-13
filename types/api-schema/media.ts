import type { UUID, ISODate, PaginatedResult } from './common';
import type { MediaAsset } from './uploads';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaFile {
  id: UUID;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  type: MediaType;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface GetMediaParams {
  page?: number;
  limit?: number;
  type?: MediaType;
  search?: string;
}

/**
 * Ответ `GET /media` после отображения в `MediaFile` — единая обёртка `{items, pagination}`
 * (`LEGACY-177`). До 13.09.2026 эта форма была своей собственной (`{data, meta}`): её строил
 * маппер в `api/endpoints/admin/media.ts`, пока сервер отдавал `{items,total,page,limit}`.
 * Теперь обёртка совпадает с серверной, и маппер переносит `pagination` как есть.
 */
export type MediaResponse = PaginatedResult<MediaFile>;

/**
 * Тело ответа `POST /media/upload`.
 *
 * 🔴 Обёртки `{ data }` здесь нет: обработчик отдаёт сам ассет
 * (`books/src/modules/media/media.controller.ts`). Прежнее объявление описывало
 * несуществующую форму, и чтение `response.data` дало бы `undefined`.
 */
export type UploadMediaResponse = MediaAsset;
