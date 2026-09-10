import type { UUID, ISODate, PaginationMeta } from './common';
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

export interface MediaResponse {
  data: MediaFile[];
  meta: PaginationMeta;
}

/**
 * Тело ответа `POST /media/upload`.
 *
 * 🔴 Обёртки `{ data }` здесь нет: обработчик отдаёт сам ассет
 * (`books/src/modules/media/media.controller.ts`). Прежнее объявление описывало
 * несуществующую форму, и чтение `response.data` дало бы `undefined`.
 */
export type UploadMediaResponse = MediaAsset;
